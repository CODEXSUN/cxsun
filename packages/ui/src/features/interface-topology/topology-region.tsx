import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import type { InterfaceTopologyController } from "./interface-topology.types";
import { TopologyMarker } from "./topology-marker";

export function TopologyRegion({
  as: Component = "section",
  children,
  className,
  id,
  topology,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "id"> & {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id: string;
  topology: InterfaceTopologyController;
}) {
  const regionProps = topology.regionProps(id);
  const highlighted = regionProps["data-ito-highlighted"];
  const style = {
    ...props.style,
    "--ito-sticker": "hsl(265 85% 52% / 0.9)"
  } as CSSProperties;

  return (
    <Component
      className={cn("relative data-[ito-highlighted=true]:z-20", className)}
      {...props}
      {...regionProps}
      style={style}
    >
      <TopologyMarker id={id} topology={topology} />
      {children}
      {highlighted ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-40 rounded-[inherit] border-2 border-[var(--ito-sticker)]"
        />
      ) : null}
    </Component>
  );
}
