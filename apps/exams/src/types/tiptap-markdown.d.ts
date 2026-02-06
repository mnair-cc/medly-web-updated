declare module "tiptap-markdown" {
  import type { Editor, Extension, Node, Mark } from "@tiptap/core";
  import type { Schema } from "prosemirror-model";
  import type { Node as ProseMirrorNode } from "prosemirror-model";

  interface SerializeOptions {
    extensions?: any[];
    html?: boolean;
    bulletListMarker?: string;
  }

  interface ParseOptions {
    extensions?: any[];
    html?: boolean;
    linkify?: boolean;
    inline?: boolean;
    breaks?: boolean;
  }

  export function serialize(
    schema: Schema,
    doc: ProseMirrorNode,
    options?: SerializeOptions,
  ): string;

  export function parse(
    schema: Schema,
    content: string,
    options?: ParseOptions,
  ): string;

  interface MarkdownExtensionOptions {
    serialize?: {
      open?: string | ((state: any, mark: any) => string);
      close?: string | ((state: any, mark: any) => string);
      expelEnclosingWhitespace?: boolean;
    };
    parse?: {
      setup?: (markdownit: any) => void;
      updateDOM?: (element: HTMLElement) => void;
    };
  }

  export function createMarkdownExtension(
    type: Node | Mark,
    options: MarkdownExtensionOptions,
  ): any;

  interface MarkdownEditorOptions {
    markdown?: {
      html?: boolean;
      tightLists?: boolean;
      tightListClass?: string;
      bulletListMarker?: string;
      linkify?: boolean;
      breaks?: boolean;
    };
  }

  export function createMarkdownEditor<T extends typeof Editor>(
    EditorClass: T,
  ): T & {
    prototype: {
      getMarkdown(): string;
      parseMarkdown(content: string, options?: { inline?: boolean }): any;
    };
  };
}
