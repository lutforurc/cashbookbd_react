import React, { useEffect, useState } from 'react';
import { padLogoIsSide } from './padLogoLayout';
import type { PadLogoConfig } from './padLogoLayout';

type Props = {
  /** The branch's logo arrangement, or null when the pad prints none. */
  config: PadLogoConfig | null;
  /** The pad heading itself: name, address, phone. */
  children: React.ReactNode;
};

/**
 * A pad head with the company logo.
 *
 * ⚠️ THE PAD IS NEVER SPLIT AND NEVER MOVED. The heading is rendered exactly as
 * it is without a logo -- one block, centred on the page. The logo lives in ONE
 * `<div>` of its own, positioned against the head: the top margin from the
 * head's top, the right or left margin from that edge. Being out of the flow,
 * the logo takes no room from the heading, so making it bigger or smaller, or
 * moving it with any margin (negative ones included), never shifts the name,
 * the address or the rule under them.
 *
 * A logo on top sits in that same one `<div>` above the heading, centred, and
 * pushes the heading down by its own height.
 *
 * With no logo -- switched off, no upload, or the image failed to load -- the
 * heading is returned exactly as it was.
 */
const PadLogo: React.FC<Props> = ({ config, children }) => {
  const [failed, setFailed] = useState(false);

  // A different upload is a fresh chance -- the previous failure says nothing
  // about this one.
  useEffect(() => {
    setFailed(false);
  }, [config?.src]);

  if (!config || !config.src || failed) return <>{children}</>;

  const image = (
    <img
      src={config.src}
      alt={config.alt}
      onError={() => setFailed(true)}
      className="pad-logo block"
      style={{ width: config.width, height: config.height, objectFit: 'contain' }}
    />
  );

  if (!padLogoIsSide(config)) {
    return (
      <div>
        <div
          className="pad-logo-box flex justify-center"
          style={{ marginTop: config.marginTop, marginBottom: 2 }}
        >
          {image}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="pad-logo-box absolute"
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
      {children}
    </div>
  );
};

export default PadLogo;
