// EasySB's mark. The artwork lives in public/logo.png, which the build copies
// verbatim next to the bundle, so the sidebar, the login page and the favicon
// all draw the same icon from one source.
export default function Logo({ size = 30, className }: { size?: number; className?: string }) {
  // Relative so the mark resolves under the panel's <base> tag, which moves when
  // a security entry prefix is configured.
  return <img className={className} src="logo.png" width={size} height={size} alt="EasySB" />
}
