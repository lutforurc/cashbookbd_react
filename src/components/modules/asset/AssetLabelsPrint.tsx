import React from 'react';
import { QRCode } from 'antd';

import PrintStyles from '../../utils/utils-functions/PrintStyles';

/**
 * The stickers that go on the things themselves.
 *
 * ⚠️ THE LABEL IS WHAT MAKES THE REGISTER TRUE. A register nobody can match to
 * the objects in the room is a list of sentences: two identical chairs, one sold
 * and one kept, cannot be told apart a year later, and the count that follows is
 * guesswork. The code on the sticker is the only thing that ties a row to a
 * thing.
 *
 * ⚠️ THE QR HOLDS A LINK, NOT THE CODE. A phone's own camera opens a link with
 * no app to install and no scanner to buy — which is the whole difference
 * between a system people use in the store room and one they use at a desk
 * afterwards from memory. It opens the register searched for that asset, so
 * whoever is standing in front of it can see what it is, who has it and when it
 * was last counted.
 *
 * ⚠️ AND THE CODE IS PRINTED IN PLAIN TEXT UNDER IT. Stickers get scuffed, and a
 * QR with a scratch through it reads as nothing at all; the printed code still
 * reads. It is also what somebody types into the search box when the sticker has
 * gone entirely.
 */

type Props = {
  rows: any[];
  /** What the labels are for, printed small at the top of the sheet. */
  caption?: string;
};

/**
 * Where scanning the sticker lands.
 *
 * Built from wherever this system is actually served rather than a hard-coded
 * host: the stickers outlive the deployment, and one printed against a
 * developer's own machine is a sticker that leads nowhere for the next five
 * years.
 */
const linkFor = (row: any) =>
  `${window.location.origin}/asset/setup?tab=register&q=${encodeURIComponent(row.code ?? '')}`;

const AssetLabelsPrint = React.forwardRef<HTMLDivElement, Props>(({ rows, caption }, ref) => (
  <div ref={ref} className="print-container hidden print:block">
    <PrintStyles />

    {/* ⚠️ Sized in millimetres, not in pixels or rems. These are cut out with
        scissors and stuck on a chair: a label that comes out a different size on
        a different screen is one that does not fit the thing it is for. */}
    <style>
      {`
        @page { margin: 8mm; }

        .asset-label-sheet {
          display: flex;
          flex-wrap: wrap;
          gap: 3mm;
        }

        .asset-label {
          width: 62mm;
          height: 30mm;
          box-sizing: border-box;
          border: 1px dashed #999;
          padding: 2mm;
          display: flex;
          align-items: center;
          gap: 2mm;
          /* Never split one label across two sheets. */
          break-inside: avoid;
          page-break-inside: avoid;
          overflow: hidden;
        }

        .asset-label-body { min-width: 0; }

        .asset-label-name {
          font-size: 8pt;
          font-weight: 600;
          line-height: 1.15;
          /* Two lines and no more: the sticker cannot grow. */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .asset-label-code {
          font-family: ui-monospace, monospace;
          font-size: 9pt;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .asset-label-foot {
          font-size: 6pt;
          color: #444;
          line-height: 1.2;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      `}
    </style>

    <div className="print-page">
      <div style={{ fontSize: '7pt', marginBottom: '2mm' }}>
        Asset labels{caption ? ` — ${caption}` : ''} · {rows.length} label(s)
      </div>

      <div className="asset-label-sheet">
        {rows.map((row: any) => (
          <div className="asset-label" key={row.id}>
            {/* SVG, not canvas: a canvas is a screen-resolution picture, and a
                QR printed from one is a QR that scans badly. */}
            <QRCode
              type="svg"
              value={linkFor(row)}
              size={92}
              bordered={false}
              style={{ width: '24mm', height: '24mm', flex: '0 0 auto' }}
            />

            <div className="asset-label-body">
              <div className="asset-label-name">{row.name}</div>
              <div className="asset-label-code">{row.code}</div>
              <div className="asset-label-foot">
                {row.category_name}
                {row.location ? ` · ${row.location}` : ''}
              </div>
              {row.serial_no ? (
                <div className="asset-label-foot">Sl. {row.serial_no}</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

AssetLabelsPrint.displayName = 'AssetLabelsPrint';

export default AssetLabelsPrint;
