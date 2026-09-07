"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
};

export default function RavinePageTransition({ children }: Props) {
  const pathname = usePathname();
  const [route, setRoute] = useState(pathname);

  useEffect(() => {
    setRoute(pathname);
  }, [pathname]);

  return (
    <div className="ravine-page-transition" data-ravine-route={route}>
      {children}
    </div>
  );
}
