import React from 'react';

/**
 * Measurement and packaging as a bill line shows it.
 *
 * Display only. Four values ride on the line: the measurement and the unit it
 * is counted in, and the package size and its unit. A saved line carries the
 * snapshot taken when it was billed (measurement_qty and packaging_text, worked
 * out by the API); a line just added carries the product's current values and
 * is snapshotted on save.
 */
export interface MeasurementLine {
  measurement?: string | number | null;
  measurement_unit?: string | null;
  package_size?: string | number | null;
  package_unit?: string | null;
  measurement_qty?: string | number | null;
  packaging_text?: string | null;
}

const blank = (value: any) =>
  value === null || value === undefined || String(value).trim() === '';

/** The snapshot fields off a saved sales detail row. */
export const measurementFromDetail = (detail: any): MeasurementLine => {
  if (!detail) return {};
  return {
    measurement: detail.measurement ?? null,
    measurement_unit: detail.measurement_unit ?? null,
    package_size: detail.package_size ?? null,
    package_unit: detail.package_unit ?? null,
    measurement_qty: detail.measurement_qty ?? null,
    packaging_text: detail.packaging_text ?? '',
  };
};

/** The current product values carried onto a newly added line, from the option. */
export const measurementFromOption = (option: any): MeasurementLine => {
  if (!option) return {};
  return {
    measurement: option.measurement ?? null,
    measurement_unit: option.measurement_unit ?? null,
    package_size: option.package_size ?? null,
    package_unit: option.package_unit ?? null,
    measurement_qty: null,
    packaging_text: '',
  };
};

/**
 * Renders the measurement and packaging beneath a product name. Nothing at all
 * -- not even a dash -- where the line carries none, so a bill from before the
 * feature reads exactly as it did.
 */
export const LineMeasurementCell: React.FC<MeasurementLine> = ({
  measurement,
  measurement_unit,
  package_size,
  package_unit,
  measurement_qty,
  packaging_text,
}) => {
  const measurementShown = !blank(measurement_qty) ? measurement_qty : measurement;
  const hasMeasurement = !blank(measurementShown);
  const hasPackagingText = !blank(packaging_text);
  const hasPackaging = hasPackagingText || !blank(package_size);

  if (!hasMeasurement && !hasPackaging) return null;

  return (
    <div className="text-xs leading-tight text-gray-500 dark:text-gray-400">
      {hasMeasurement && (
        <div>
          <span className="font-medium">Measurement:</span> {measurementShown}
          {!blank(measurement_unit) ? ` ${measurement_unit}` : ''}
        </div>
      )}
      {hasPackaging && (
        <div>
          <span className="font-medium">Packaging:</span>{' '}
          {hasPackagingText
            ? packaging_text
            : `${package_size}${!blank(package_unit) ? ` ${package_unit}` : ''}`}
        </div>
      )}
    </div>
  );
};

export default LineMeasurementCell;
