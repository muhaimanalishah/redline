"use client";

import Editor from "@/components/Editor";

export default function Home() {
  return (
    <main style={{ maxWidth: "880px", margin: "0 auto", padding: "56px 24px 100px" }}>
      <Editor onChange={(text) => console.log("Editor content:", text)} />
    </main>
  );
}
