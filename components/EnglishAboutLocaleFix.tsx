"use client";

import { useEffect } from "react";

const REPLACEMENTS: Record<string, string> = {
  "رَافِين / عن المنصة": "RAVINE / ABOUT THE PLATFORM",
  "مساحة تعطي العمل حقّه.": "A space that gives the work its due.",
  "رَافِين منصة إبداعية سينمائية تُبنى حول العمل نفسه: كيف صُنِع، من يقف خلفه، ما الذي ألهمه، وما الحوار الذي يفتحه. نريد اكتشافًا أهدأ، هوية أوضح للمبدعين، وسياقًا يجعل كل عمل جزءًا من قصة أكبر.": "RAVINE is a cinematic creative platform built around the work itself: how it was made, who stands behind it, what inspired it, and the conversations it opens. We want quieter discovery, clearer creator identity, and context that lets every work become part of a larger story.",
  "العمل أولًا": "Work first",
  "الضجيج والأرقام وسائل للاكتشاف، لا معيارًا وحيدًا للقيمة.": "Noise and numbers can help discovery, but they are not the sole measure of value.",
  "المبدع كاملًا": "The creator as a whole",
  "الهوية والاعتمادات ومسار الأعمال تعيش معًا بدل أن تتجزأ في قنوات منفصلة.": "Identity, credits, and the body of work live together instead of being split across separate channels.",
  "رحلة مترابطة": "A connected journey",
  "من العمل إلى المجتمع والجلسات المباشرة والبرامج الصوتية ثم العودة إلى الحوار.": "From the work to the community, Live sessions, and Podcasts — then back into the conversation.",
};

function translateTextNodes(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  for (const node of nodes) {
    const value = node.nodeValue;
    if (!value) continue;

    const replacement = REPLACEMENTS[value.trim()];
    if (!replacement) continue;

    node.nodeValue = value.replace(value.trim(), replacement);
  }
}

export default function EnglishAboutLocaleFix() {
  useEffect(() => {
    if (!window.location.pathname.startsWith("/en")) return;

    const run = () => translateTextNodes(document.body);
    run();

    const observer = new MutationObserver(() => run());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
