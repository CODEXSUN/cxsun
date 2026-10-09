import logoUrl from "../public/images/logo.svg";

export function ZetroLogo({ className }: { className?: string }) {
  return <img src={logoUrl} alt="" aria-hidden="true" className={className} />;
}
