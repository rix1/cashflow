import type { FC } from "hono/jsx";

/** Small square logo; the server answers with a cached favicon or an SVG monogram. */
export const Logo: FC<{ merchant: string; size?: number }> = (
  { merchant, size = 20 },
) => (
  <img
    class="logo"
    src={`/logo/${encodeURIComponent(merchant)}`}
    width={size}
    height={size}
    loading="lazy"
    alt=""
    style={`width:${size}px;height:${size}px`}
  />
);
