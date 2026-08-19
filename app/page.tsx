"use client";

import Editor from "@/components/Editor";

export default function Home() {
  return (
    <div style={{ padding: "64px 16px" }}>
      <Editor onChange={(text) => console.log("Editor content:", text)} />
    </div>
  );
}
