/**
 * Tables for Quill 1.3.7, which ships none of its own.
 *
 * Quill models a document as a tree of blots, and only understands the tags it
 * has blots for -- everything else is stripped the moment the editor touches
 * it. So a table cannot be pasted in as HTML; it has to be taught. These four
 * blots are that lesson: a cell is a line of text, and rows, a body and the
 * table itself nest around it.
 *
 * Each cell carries its row's id in `data-row`. That is what holds a row
 * together: Quill is free to merge and split neighbouring blots as it
 * normalises the tree, and the id is how a row's cells recognise each other
 * afterwards.
 *
 * The markup that comes out -- plain table/tbody/tr/td -- is what dompdf reads
 * best, which matters because the block written here prints on the letter.
 */
import { Quill } from 'react-quill-new';

const Block: any = Quill.import('blots/block');
const Container: any = Quill.import('blots/container');
const Parchment: any = Quill.import('parchment');
const Delta: any = Quill.import('delta');
const Module: any = Quill.import('core/module');

/** Short and unique enough: it only has to tell one row from its neighbours. */
const rowId = () => `row-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Puts a blot inside the container it declares it belongs in, creating that
 * container if it is missing.
 *
 * Later Quills do this themselves for any blot with a `requiredContainer`;
 * 1.3.7 does not, and without it the cells stay loose in the document -- a run
 * of <td> with no <table> around them. A browser draws those anyway, so it
 * looks nearly right on screen, but the PDF renderer refuses them outright.
 *
 * Called from optimize, which Quill runs over and over until the document
 * stops changing: a cell is put in a row, that row in a body, and the body in
 * the table, one pass at a time.
 */
const wrapInRequiredContainer = (blot: any) => {
  const container = blot.statics.requiredContainer;

  if (container != null && !(blot.parent instanceof container)) {
    blot.wrap(container.blotName);
  }
};

/** Joins a container to the one after it, when they belong together. */
const mergeWithNext = (blot: any) => {
  if (blot.checkMerge()) {
    blot.next.moveChildren(blot);
    blot.next.remove();
  }
};

class TableCell extends Block {
  static blotName = 'table';
  static tagName = 'TD';

  static create(value: string) {
    const node = super.create();
    node.setAttribute('data-row', value || rowId());
    return node;
  }

  static formats(domNode: HTMLElement) {
    return domNode.hasAttribute('data-row')
      ? domNode.getAttribute('data-row')
      : undefined;
  }

  cellOffset() {
    return this.parent ? this.parent.children.indexOf(this) : -1;
  }

  format(name: string, value: string) {
    if (name === TableCell.blotName && value) {
      this.domNode.setAttribute('data-row', value);
    } else {
      super.format(name, value);
    }
  }

  optimize(...args: any[]) {
    super.optimize(...args);
    wrapInRequiredContainer(this);
  }

  row() {
    return this.parent;
  }

  rowOffset() {
    return this.row() ? this.row().rowOffset() : -1;
  }

  table() {
    return this.row() && this.row().table();
  }
}

class TableRow extends Container {
  static blotName = 'table-row';
  static tagName = 'TR';

  /**
   * Two rows may only fuse into one when every cell involved belongs to the
   * same row id -- otherwise a table of three rows would collapse into one
   * long one the first time Quill tidied the tree.
   */
  checkMerge() {
    if (
      this.next == null ||
      this.next.statics.blotName !== this.statics.blotName ||
      this.children.head == null ||
      this.next.children.head == null
    ) {
      return false;
    }

    const thisHead = this.children.head.formats();
    const thisTail = this.children.tail.formats();
    const nextHead = this.next.children.head.formats();
    const nextTail = this.next.children.tail.formats();

    return (
      thisHead.table === thisTail.table &&
      thisHead.table === nextHead.table &&
      thisHead.table === nextTail.table
    );
  }

  /** Cells that no longer share a row id are split off into their own row. */
  optimize(...args: any[]) {
    super.optimize(...args);

    this.children.forEach((child: any) => {
      if (child.next == null) {
        return;
      }

      if (child.formats().table !== child.next.formats().table) {
        const next = this.splitAfter(child);
        if (next) {
          next.optimize();
        }
        if (this.prev) {
          this.prev.optimize();
        }
      }
    });

    // Each cell arrives wearing a row of its own; the ones that share an id
    // are gathered back into a single row here.
    mergeWithNext(this);
    wrapInRequiredContainer(this);
  }

  rowOffset() {
    return this.parent ? this.parent.children.indexOf(this) : -1;
  }

  table() {
    return this.parent && this.parent.parent;
  }
}

class TableBody extends Container {
  static blotName = 'table-body';
  static tagName = 'TBODY';

  /** Rows only ever have the one body to sit in, so bodies always fuse. */
  checkMerge() {
    return (
      this.next != null && this.next.statics.blotName === this.statics.blotName
    );
  }

  optimize(...args: any[]) {
    super.optimize(...args);
    mergeWithNext(this);
    wrapInRequiredContainer(this);
  }
}

class TableContainer extends Container {
  static blotName = 'table-container';
  static tagName = 'TABLE';

  /**
   * Two tables side by side are one table with its body written twice -- the
   * bodies fuse on the pass after this one, and the rows on the pass after
   * that, until what was a run of loose cells is a single table again.
   */
  checkMerge() {
    return (
      this.next != null && this.next.statics.blotName === this.statics.blotName
    );
  }

  optimize(...args: any[]) {
    super.optimize(...args);
    mergeWithNext(this);
  }

  /**
   * Deleting into a table can leave one row shorter than the rest, which the
   * browser draws as a ragged edge. Short rows are padded back out.
   */
  balanceCells() {
    const rows = this.descendants(TableRow);
    const columns = rows.reduce(
      (most: number, row: any) => Math.max(row.children.length, most),
      0,
    );

    rows.forEach((row: any) => {
      new Array(columns - row.children.length).fill(0).forEach(() => {
        const value =
          row.children.head != null
            ? TableCell.formats(row.children.head.domNode)
            : undefined;
        const cell = Parchment.create(TableCell.blotName, value);
        row.appendChild(cell);
        cell.optimize();
      });
    });
  }

  insertRow(index: number) {
    const [body] = this.descendant(TableBody);
    if (body == null || body.children.head == null) {
      return;
    }

    const id = rowId();
    const row = Parchment.create(TableRow.blotName);

    body.children.head.children.forEach(() => {
      row.appendChild(Parchment.create(TableCell.blotName, id));
    });

    body.insertBefore(row, body.children.at(index));
  }

  /**
   * A column is a cell added to every row at the same offset. Each one takes
   * the row id of the cells it joins, or the row would split in two the next
   * time Quill normalised the tree.
   */
  insertColumn(index: number) {
    const [body] = this.descendant(TableBody);
    if (body == null || body.children.head == null) {
      return;
    }

    body.children.forEach((row: any) => {
      if (row.children.head == null) {
        return;
      }

      const value = TableCell.formats(row.children.head.domNode);
      const cell = Parchment.create(TableCell.blotName, value);

      // Past the last cell `at` gives nothing back, and insertBefore reads
      // that as "at the end" -- which is where a column added on the right
      // belongs anyway.
      row.insertBefore(cell, row.children.at(index));
      cell.optimize();
    });
  }

  deleteColumn(index: number) {
    const [body] = this.descendant(TableBody);
    if (body == null || body.children.head == null) {
      return;
    }

    body.children.forEach((row: any) => {
      const cell = row.children.at(index);
      if (cell != null) {
        cell.remove();
      }
    });
  }

  rows() {
    const body = this.children.head;
    return body == null ? [] : body.children.map((row: any) => row);
  }
}

TableContainer.allowedChildren = [TableBody];
TableBody.requiredContainer = TableContainer;

TableBody.allowedChildren = [TableRow];
TableRow.requiredContainer = TableBody;

TableRow.allowedChildren = [TableCell];
TableCell.requiredContainer = TableRow;

class TableModule extends Module {
  /** Quill calls this when the module is registered. */
  static register() {
    Quill.register(TableCell);
    Quill.register(TableRow);
    Quill.register(TableBody);
    Quill.register(TableContainer);
  }

  constructor(quill: any, options: any) {
    super(quill, options);
    this.listenBalanceCells();
  }

  /**
   * Where the cursor is, in table terms. Returns nulls when it is not in a
   * table at all, which is how the toolbar knows to do nothing.
   */
  getTable(range = this.quill.getSelection()) {
    if (range == null) {
      return [null, null, null, -1];
    }

    const [cell, offset] = this.quill.getLine(range.index);
    if (cell == null || cell.statics.blotName !== TableCell.blotName) {
      return [null, null, null, -1];
    }

    const row = cell.parent;
    return [row.parent.parent, row, cell, offset];
  }

  insertTable(rows: number, columns: number) {
    const range = this.quill.getSelection();
    if (range == null) {
      return;
    }

    // One cell is one line, so a table is simply that many newlines, each
    // formatted with the id of the row it belongs to.
    const delta = new Array(rows)
      .fill(0)
      .reduce((memo: any) => {
        const text = new Array(columns).fill('\n').join('');
        return memo.insert(text, { table: rowId() });
      }, new Delta().retain(range.index))
      .delete(range.length);

    this.quill.updateContents(delta, Quill.sources.USER);
    this.quill.setSelection(range.index, Quill.sources.SILENT);
    this.balanceTables();
  }

  insertRowBelow() {
    const [table, row] = this.getTable();
    if (table == null) {
      return;
    }

    table.insertRow(row.rowOffset() + 1);
    this.quill.update(Quill.sources.USER);
  }

  /**
   * A cell is a line, and a line is one character to Quill, so every row that
   * sits above the cursor pushes it along by one as it grows its own cell --
   * and by one more when the new column is inserted to the left of the cursor.
   * Without that the caret would drift out of the cell it was left in.
   */
  insertColumn(offset: number) {
    const range = this.quill.getSelection();
    const [table, row, cell] = this.getTable(range);
    if (table == null) {
      return;
    }

    table.insertColumn(cell.cellOffset() + offset);
    this.quill.update(Quill.sources.USER);

    const shift = row.rowOffset() + (offset === 0 ? 1 : 0);
    this.quill.setSelection(range.index + shift, range.length, Quill.sources.SILENT);
  }

  insertColumnRight() {
    this.insertColumn(1);
  }

  /**
   * Taking the only column away would leave an empty frame behind -- a table
   * with rows and nothing in them, which still prints on the letter. The last
   * column takes the table with it instead.
   */
  deleteColumn() {
    const [table, row, cell] = this.getTable();
    if (table == null) {
      return;
    }

    if (row.children.length <= 1) {
      this.deleteTable();
      return;
    }

    table.deleteColumn(cell.cellOffset());
    this.quill.update(Quill.sources.USER);
  }

  deleteTable() {
    const [table] = this.getTable();
    if (table == null) {
      return;
    }

    const offset = table.offset();
    table.remove();
    this.quill.update(Quill.sources.USER);
    this.quill.setSelection(offset, Quill.sources.SILENT);
  }

  balanceTables() {
    this.quill.scroll
      .descendants(TableContainer)
      .forEach((table: any) => table.balanceCells());
  }

  /**
   * Typing and deleting reshape the tree, so the tables are levelled again
   * after every change the user makes.
   */
  listenBalanceCells() {
    this.quill.on(Quill.events.SCROLL_OPTIMIZE, (mutations: any[]) => {
      mutations.some((mutation) => {
        if (['TD', 'TR', 'TBODY', 'TABLE'].indexOf(mutation.target.tagName) === -1) {
          return false;
        }

        this.quill.once(Quill.events.TEXT_CHANGE, (name: string, delta: any, source: string) => {
          if (source !== Quill.sources.USER) {
            return;
          }
          this.balanceTables();
        });

        return true;
      });
    });
  }
}

export default TableModule;
