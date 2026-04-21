import type { ReactNode } from "react";

export default function Alert({
  tone,
  title,
  children
}: {
  tone: "danger" | "success" | "info";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`alert alert-${tone}`}>
      {title ? <div className="alert-title">{title}</div> : null}
      <div className="alert-body">{children}</div>
    </div>
  );
}

