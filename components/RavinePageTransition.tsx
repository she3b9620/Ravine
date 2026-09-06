"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
};

export default function RavinePageTransition({ children }: Props) {
  const pathname = usePathname();
  const [transitionKey, setTransitionKey] = useState(pathname);

  useEffect(() => {
    setTransitionKey(pathname);
  }, [pathname]);

  return (
    <div key={transitionKey} className="ravine-page-transition" data-ravine-route={pathname}>
      {children}
    </div>
  );
}
