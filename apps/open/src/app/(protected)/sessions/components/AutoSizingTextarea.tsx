const AutoSizingTextarea = ({
  placeholder,
  value,
  onChange,
  onBlur,
}: {
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
}) => {
  return (
    <div
      className="
        grid
        [&>textarea]:resize-none
        [&>textarea]:overflow-hidden
        [&>textarea]:[grid-area:1/1/2/2]
        [&>textarea]:break-all
        after:[grid-area:1/1/2/2]
        after:whitespace-pre-wrap
        after:break-all
        after:invisible
        after:content-[attr(data-cloned-val)_'_']
    "
      data-cloned-val={value || ""}
    >
      <textarea
        className="w-full appearance-none outline-none break-all"
        name="comment"
        id="comment"
        rows={1}
        value={value}
        onInput={(e) => {
          const textarea = e.target as HTMLTextAreaElement;
          const parentNode = textarea.parentNode as HTMLElement;
          parentNode.dataset.clonedVal = textarea.value;
          onChange?.(textarea.value);
        }}
        onBlur={(e) => {
          const textarea = e.target as HTMLTextAreaElement;
          onBlur?.(textarea.value);
        }}
        placeholder={placeholder}
      ></textarea>
    </div>
  );
};

export default AutoSizingTextarea;
