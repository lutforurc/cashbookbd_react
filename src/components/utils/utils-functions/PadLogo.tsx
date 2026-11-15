import React, { useEffect, useState } from 'react';
import { padLogoIsSide } from './padLogoLayout';
import type { PadLogoConfig } from './padLogoLayout';

type Props = {
  config: PadLogoConfig;
  /** Extra classes for the image itself, for a caller that wants its own frame. */
  className?: string;
};

/**
 * The company mark on a pad head, placed as the branch asked.
 *
 * A logo beside the heading is drawn out of the flow and positioned against the
 * head, so it sits exactly the margin the branch typed away from the paper's
 * edge. The heading reserves that room -- see `padLogoReserve` -- so the two can
 * never overlap however long the branch name is. A logo above the heading is in
 * the flow instead: it adds its own height and pushes the name down.
 *
 * ⚠️ A SIDE LOGO NEEDS A `relative` PARENT. Both pad heads wrap their heading in
 * one for this reason, and so does the preview on the Branch screen.
 *
 * The image is printed as it loads: a print that starts before the upload has
 * finished would otherwise clone the pad without a logo. A mark that fails to
 * load is dropped rather than printed as a broken image.
 */
const PadLogo: React.FC<Props> = ({ config, className = '' }) => {
  const [failed, setFailed] = useState(false);

  // A different upload is a fresh chance -- the previous failure says nothing
  // about this one.
  useEffect(() => {
    setFailed(false);
  }, [config.src]);

  if (!config.src || failed) return null;

  const image = (
    <img
      src={config.src}
      alt={config.alt}
      onError={() => setFailed(true)}
      className={`pad-logo max-w-full ${className}`}
      style={{ width: config.width, height: config.height, objectFit: 'contain' }}
    />
  );

  if (!padLogoIsSide(config)) {
    return (
      <div className="flex justify-center" style={{ marginTop: config.marginTop, marginBottom: 2 }}>
        {image}
      </div>
    );
  }

  return (
    <div
      className="pad-logo absolute"
      style={{
        top: config.marginTop,
        ...(config.position === 'right'
          ? { right: config.marginRight }
          : { left: config.marginLeft }),
        breakInside: 'avoid',
      }}
    >
      {image}
    </div>
  );
};

export default PadLogo;
