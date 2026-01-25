<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import TextAlign from '@tiptap/extension-text-align';

  export let content = '';

  const dispatch = createEventDispatcher();

  let element;
  let editor;

  onMount(() => {
    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        TextAlign.configure({
          types: ['heading', 'paragraph']
        })
      ],
      content,
      onUpdate: ({ editor }) => {
        dispatch('update', editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-2'
        }
      }
    });
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  $: if (editor && content !== editor.getHTML()) {
    editor.commands.setContent(content, false);
  }
</script>

<div class="rich-text-editor border border-gray-200 rounded overflow-hidden">
  <!-- Toolbar -->
  {#if editor}
    <div class="flex items-center gap-1 p-1 bg-gray-50 border-b border-gray-200">
      <button
        type="button"
        class="p-1 rounded hover:bg-gray-200 {editor.isActive('bold') ? 'bg-gray-200' : ''}"
        on:click={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1 rounded hover:bg-gray-200 {editor.isActive('italic') ? 'bg-gray-200' : ''}"
        on:click={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" />
        </svg>
      </button>

      <div class="w-px h-4 bg-gray-300 mx-1"></div>

      <button
        type="button"
        class="p-1 rounded hover:bg-gray-200 {editor.isActive('bulletList') ? 'bg-gray-200' : ''}"
        on:click={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1 rounded hover:bg-gray-200 {editor.isActive('orderedList') ? 'bg-gray-200' : ''}"
        on:click={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20h14M7 12h14M7 4h14M3 20v-2m0-6V8m0-6v2" />
        </svg>
      </button>

      <div class="w-px h-4 bg-gray-300 mx-1"></div>

      <button
        type="button"
        class="p-1 rounded hover:bg-gray-200 {editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}"
        on:click={() => editor.chain().focus().setTextAlign('left').run()}
        title="Align Left"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h10M4 18h14" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1 rounded hover:bg-gray-200 {editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}"
        on:click={() => editor.chain().focus().setTextAlign('center').run()}
        title="Align Center"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M7 12h10M5 18h14" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1 rounded hover:bg-gray-200 {editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}"
        on:click={() => editor.chain().focus().setTextAlign('right').run()}
        title="Align Right"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M10 12h10M6 18h14" />
        </svg>
      </button>
    </div>
  {/if}

  <!-- Editor Content -->
  <div bind:this={element} class="bg-white"></div>
</div>

<style>
  .rich-text-editor :global(.ProseMirror) {
    min-height: 100px;
    padding: 0.5rem;
  }

  .rich-text-editor :global(.ProseMirror:focus) {
    outline: none;
  }

  .rich-text-editor :global(.ProseMirror p) {
    margin: 0.25rem 0;
  }

  .rich-text-editor :global(.ProseMirror ul),
  .rich-text-editor :global(.ProseMirror ol) {
    padding-left: 1.5rem;
    margin: 0.25rem 0;
  }
</style>
