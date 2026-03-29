import type { PropsWithChildren, ReactNode } from "react";

interface PanelFrameProps extends PropsWithChildren {
  eyebrow?: string;
  title?: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
}

export function PanelFrame({
  eyebrow,
  title,
  description,
  footer,
  className,
  children,
}: PanelFrameProps) {
  const classes = ["panel-frame", className].filter(Boolean).join(" ");
  const hasHeader = Boolean(eyebrow || title || description);

  return (
    <section className={classes}>
      {hasHeader ? (
        <header className="panel-header">
          {eyebrow ? <p className="panel-eyebrow">{eyebrow}</p> : null}
          {title ? <h2 className="panel-title">{title}</h2> : null}
          {description ? <p className="panel-description">{description}</p> : null}
        </header>
      ) : null}
      <div className="panel-body">{children}</div>
      {footer ? <footer className="panel-footer">{footer}</footer> : null}
    </section>
  );
}
