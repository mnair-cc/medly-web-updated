/**
 * TODO: TECH DEBT - Refactor Input Bar Duplication (High Priority)
 * 
 * This file is ~90% duplicated with MOChatInputBar.tsx (~700 lines each).
 * See MOChatInputBar.tsx for full refactoring plan.
 * 
 * CRITICAL: When fixing bugs or adding features, check BOTH files!
 */

import { useRef, useLayoutEffect, useState, useEffect, useMemo } from "react";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import Spinner from "@/app/_components/Spinner";
import type { SelectedScreenshot, DraggedContextItem } from "../chat/MOChatLayoutClient";
import { SUPPORTED_FILE_ACCEPT } from "../../_utils/convertDocument";
import { DocumentTypeChip, type DocumentType, type DocumentLabel } from "../icons/DocumentTypeIcons";

// Folder icon for context display
const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.81055 21.7578H21.4092C23.0879 21.7578 24.0635 20.7822 24.0635 18.9014V9.86621C24.0635 7.98535 23.0791 7.00977 21.1807 7.00977H13.0068C12.374 7.00977 12.0049 6.86035 11.5215 6.46484L11.0117 6.06055C10.3965 5.55078 9.93945 5.38379 9.02539 5.38379H6.53809C4.89453 5.38379 3.92773 6.3418 3.92773 8.1875V18.9014C3.92773 20.7822 4.91211 21.7578 6.81055 21.7578ZM5.65039 8.33691C5.65039 7.52832 6.08984 7.10645 6.88086 7.10645H8.56836C9.19238 7.10645 9.55273 7.24707 10.0449 7.65137L10.5547 8.06445C11.1611 8.56543 11.6357 8.73242 12.5498 8.73242H21.084C21.8926 8.73242 22.3408 9.1543 22.3408 10.0156V10.5254H5.65039V8.33691ZM6.91602 20.0352C6.09863 20.0352 5.65039 19.6133 5.65039 18.7607V12.0459H22.3408V18.7607C22.3408 19.6133 21.8926 20.0352 21.084 20.0352H6.91602Z"
      fill="#8E8E93"
    />
  </svg>
);

// Plus icon for add button
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3.33334V12.6667" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.33334 8H12.6667" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Inline arrow icon with dynamic colors
const ArrowIcon = ({ backgroundColor, fillColor }: { backgroundColor: string; fillColor: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
  >
    <g clipPath="url(#clip0_arrow)">
      <path
        d="M24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12Z"
        fill={backgroundColor}
      />
      <path
        d="M11.9968 18C12.4806 18 12.8141 17.6787 12.8141 17.2V9.73543L12.7553 8.3685L14.305 10.0567L15.7828 11.4677C15.9332 11.6063 16.1293 11.7008 16.3648 11.7008C16.8094 11.7008 17.1429 11.3859 17.1429 10.9449C17.1429 10.737 17.0579 10.5417 16.8879 10.3779L12.6049 6.24567C12.448 6.08819 12.2191 6 11.9968 6C11.7744 6 11.5521 6.08819 11.3951 6.24567L7.11219 10.3779C6.94218 10.5417 6.85718 10.737 6.85718 10.9449C6.85718 11.3859 7.19067 11.7008 7.63531 11.7008C7.87071 11.7008 8.06688 11.6063 8.21727 11.4677L9.68849 10.0567L11.2383 8.3685L11.1859 9.73543V17.2C11.1859 17.6787 11.5129 18 11.9968 18Z"
        fill={fillColor}
      />
    </g>
    <defs>
      <clipPath id="clip0_arrow">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

function InputBar({
  style = "default",
  userInput,
  setUserInput,
  handleFilterUserMessageAndSend,
  canReply,
  options,
  highlightInput,
  autoFocus = true,
  backgroundColor = "",
  placeholder = "Ask anything",
  selectedText,
  updateSelectedText,
  selectedScreenshot,
  updateSelectedScreenshot,
  suggestions,
  currentSkill,
  updateCurrentSkill,
  updateCurrentSkillPrompt,
  draggedContexts,
  removeDraggedContext,
  shortcuts,
  primaryColor,
  messageCount = 0,
  onFileSelect,
  isUploading = false,
  totalDocsInCollection = 0,
  currentDocumentName,
  currentDocumentType,
  currentDocumentLabel,
  currentFolderName,
}: {
  style?: "default" | "flat";
  userInput: string;
  setUserInput: (input: string) => void;
  handleFilterUserMessageAndSend: (input: string) => void;
  canReply: boolean;
  options: string[];
  highlightInput?: boolean;
  autoFocus?: boolean;
  backgroundColor?: string;
  placeholder?: string;
  selectedText?: string | null;
  updateSelectedText?: (text: string | null) => void;
  selectedScreenshot?: SelectedScreenshot | null;
  updateSelectedScreenshot?: (screenshot: SelectedScreenshot | null) => void;
  suggestions?: string[];
  shortcuts?: string[];
  currentSkill?: string | null;
  updateCurrentSkill?: (skill: string | null) => void;
  updateCurrentSkillPrompt?: (prompt: string | null) => void;
  draggedContexts?: DraggedContextItem[];
  removeDraggedContext?: (id: string) => void;
  primaryColor?: string;
  messageCount?: number;
  onFileSelect?: (file: File) => void;
  isUploading?: boolean;
  totalDocsInCollection?: number;
  currentDocumentName?: string | null;
  currentDocumentType?: DocumentType;
  currentDocumentLabel?: DocumentLabel;
  currentFolderName?: string | null;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [isSkillMenuAnimated, setIsSkillMenuAnimated] = useState(false);
  const [selectedSkillIndex, setSelectedSkillIndex] = useState(0);
  const [skillSearchText, setSkillSearchText] = useState('');

  // Skills list
  const skills = [
    { name: 'Brief me', description: 'Get a brief pre-lecture summary of the content', prompt: 'Reply with a concise pre-lecture brief to help students prepare for this lecture (DO NOT USE THE REWRITE_NOTES TOOL NOW). This is a high-level roadmap, not a detailed summary—avoid explaining concepts or diving into specifics.\n\n You MUST use the following structure:\n\n1. **Opening** (1-2 sentences): State what this lecture connects or bridges.\n\n2. **Prior Knowledge You\'ll Need** (2-3 brief points): List prerequisite concepts students should review. Keep each point to one line.\n\n3. **Main Ideas to Focus On** (3-4 sections with slide references): Group related slides into thematic sections. For each section, use forward-looking language like "you\'ll explore...", "the lecture will cover...", or "you\'ll see how..." State WHAT will be covered, not the details of HOW or WHY. Keep descriptions high-level (1-2 sentences per section).\n\n4. **Top Things to Watch For** (3 points): Highlight the most important concepts or common misconceptions. Lead with bolded key phrases, then one brief explanation sentence. Target ~200 words total. Use formatting (bold, headers) for scannability. Remember: you\'re previewing the slides, not teaching the student.', autoSend: true, showOnTranscription: false },
    { name: 'Define', description: 'Get a clear definition of a term or concept', prompt: 'Provide a clear and concise definition of the selected term or concept. The purpose is for the student to understand what the term they highlighted means, and its relevance within the context of the slides. You must: 1. Provide a clear and concise definition of the term (the relevant Oxford dictionary definition, not all the definitions it could be). 2. Explain the term in a way that is easy to understand within the context of the slides, 3. Provide a real-world example or application of the term or concept.', autoSend: false, showOnTranscription: false },
    // { name: 'Summarize', description: 'Get a concise summary of the slides' },
    // { name: 'Explain', description: 'Get a detailed explanation' },
    // { name: 'Contextualize', description: 'Understand the context and relevance' },
    { name: 'Simplify', description: 'Simplify the content', prompt: 'Simplify the content on this page, breaking down complex concepts into easier to understand explanations.', autoSend: false, showOnTranscription: false },
    { name: 'Add comment', description: 'Automatically add an annotation', prompt: 'Suggest a comment to add based on what was just said in the transcript and/or recently in the conversation history. The most recent text in the transcription is most salient when adding the comment. The purpose is to quickly jot down a comment to help recall this comment later.', autoSend: true, showOnTranscription: true },
    { name: 'What did I miss?', description: 'Recap what was just said in the lecture', prompt: 'Recap in bullet points, the 3 most key points most recently mentioned in the transcript - you must ONLY mention the key points said in the TRANSCRIPT. Provide a reference to what slide the professor is currently on or discussing. You must only include key points mentioned in the transcription as the user wants a recap on what they just missed in the lecture that was just said. If nothing was just said or the transcript is empty, just say that there is no transcript available yet, and I should start transcription in the lecture.', autoSend: true, showOnTranscription: true },
  ];

  // Filtered skills based on search text
  const filteredSkills = useMemo(() => {
    if (!skillSearchText) return skills;
    const searchLower = skillSearchText.toLowerCase();
    return skills.filter(skill => skill.name.toLowerCase().includes(searchLower));
  }, [skillSearchText]);


  // Focus textarea when selectedText is populated (from "Ask" button)
  // But only if the editor is not currently focused (to avoid stealing focus during text selection)
  useEffect(() => {
    if (selectedText && selectedText.trim() && inputRef.current) {
      // Check if the editor (ProseMirror/TipTap) is currently focused
      const activeElement = document.activeElement;
      const isEditorFocused = activeElement && (
        activeElement.closest('.ProseMirror') ||
        activeElement.closest('.tiptap') ||
        activeElement.closest('[contenteditable="true"]')
      );

      // Only auto-focus if editor is NOT focused (prevents stealing focus during selection)
      if (!isEditorFocused) {
        inputRef.current.focus();
      }
    }
  }, [selectedText]);

  // Animate skill menu entrance
  useEffect(() => {
    if (showSkillMenu) {
      setSelectedSkillIndex(0); // Reset to first skill
      requestAnimationFrame(() => {
        setIsSkillMenuAnimated(true);
      });
    } else {
      setIsSkillMenuAnimated(false);
    }
  }, [showSkillMenu]);

  // Reset selected index when filtered skills change
  useEffect(() => {
    if (showSkillMenu && filteredSkills.length > 0) {
      setSelectedSkillIndex(0);
    }
  }, [filteredSkills.length, showSkillMenu]);

  // Close menu if no filtered results
  useEffect(() => {
    if (showSkillMenu && filteredSkills.length === 0) {
      setShowSkillMenu(false);
      setSkillSearchText('');
    }
  }, [filteredSkills.length, showSkillMenu]);

  const handleSkillSelect = (skillName: string) => {
    // Find the skill
    const skill = skills.find(s => s.name === skillName);

    if (updateCurrentSkill) {
      updateCurrentSkill(skillName);
    }
    setShowSkillMenu(false);
    setSkillSearchText('');

    // Find the skill and pass its prompt to the parent
    if (skill?.prompt && updateCurrentSkillPrompt) {
      updateCurrentSkillPrompt(skill.prompt);
    }

    // If autoSend is true, automatically send the message
    if (skill?.autoSend && canReply) {
      const messageToSend = `/${skillName}`;
      handleFilterUserMessageAndSend(messageToSend);
      setUserInput("");
      if (updateCurrentSkill) {
        updateCurrentSkill(null);
      }
      if (updateCurrentSkillPrompt) {
        updateCurrentSkillPrompt(null);
      }
      if (inputRef.current) {
        inputRef.current.style.height = "40px";
      }
    } else {
      setUserInput('');
      if (inputRef.current) {
        inputRef.current.style.height = "40px";
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle skill menu navigation
    if (showSkillMenu) {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSkillMenu(false);
        setUserInput('');
        setSkillSearchText('');
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSkillIndex((prev) => (prev + 1) % filteredSkills.length);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSkillIndex((prev) => (prev - 1 + filteredSkills.length) % filteredSkills.length);
        return;
      }

      if (e.key === "Enter" && filteredSkills.length > 0) {
        e.preventDefault();
        handleSkillSelect(filteredSkills[selectedSkillIndex].name);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && canReply) {
      e.preventDefault();

      // Check if current skill has autoSend enabled
      if (currentSkill) {
        const skill = skills.find(s => s.name === currentSkill);
        if (skill?.autoSend) {
          // Auto-send without waiting for user input
          const messageToSend = `/${currentSkill}`;
          handleFilterUserMessageAndSend(messageToSend);
          setUserInput("");
          if (updateCurrentSkill) {
            updateCurrentSkill(null);
          }
          if (updateCurrentSkillPrompt) {
            updateCurrentSkillPrompt(null);
          }
          // Reset textarea height after sending
          if (inputRef.current) {
            inputRef.current.style.height = "40px";
          }
          return;
        }
      }

      // Normal send behavior for non-autoSend skills or no skill
      const messageToSend = currentSkill ? `/${currentSkill} ${userInput}` : userInput;
      handleFilterUserMessageAndSend(messageToSend);
      setUserInput("");
      if (updateCurrentSkill) {
        updateCurrentSkill(null);
      }
      if (updateCurrentSkillPrompt) {
        updateCurrentSkillPrompt(null);
      }
      // Reset textarea height after sending
      if (inputRef.current) {
        inputRef.current.style.height = "40px";
      }
    } else if (e.key === "Backspace" && !userInput.trim() && currentSkill) {
      e.preventDefault();
      if (updateCurrentSkill) {
        updateCurrentSkill(null);
      }
      if (updateCurrentSkillPrompt) {
        updateCurrentSkillPrompt(null);
      }
    }
  };

  // Function to auto-resize textarea
  const adjustHeight = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    const newHeight = Math.max(element.scrollHeight, 38);
    element.style.height = `${newHeight}px`;
  };

  // Adjust height on mount and when userInput changes
  useLayoutEffect(() => {
    if (inputRef.current) {
      // For empty input, explicitly set to minimum height
      if (!userInput.trim()) {
        inputRef.current.style.height = "40px";
      } else {
        adjustHeight(inputRef.current);
      }
    }
  }, [userInput]);

  const SkillContainer = ({ skillName }: { skillName: string }) => {
    return (
      <div className="group relative text-[14px] font-rounded-bold bg-[#F2F2F7] rounded-[12px] py-1.5 px-3 ml-1 -mr-1 whitespace-nowrap">
        {skillName}
        {/* Gradient fade overlay */}
        <div
          className="absolute inset-y-0 right-0 w-[40px] pointer-events-none rounded-r-[12px] opacity-0 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(to right, transparent 0%, #F2F2F7 50%, #F2F2F7 100%)',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 right-2 z-10 opacity-0 group-hover:opacity-100 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            // Add onClick handler here if needed
          }}
        >
          <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.08789 18.1758C14.0713 18.1758 18.1846 14.0625 18.1846 9.08789C18.1846 4.11328 14.0625 0 9.0791 0C4.10449 0 0 4.11328 0 9.08789C0 14.0625 4.11328 18.1758 9.08789 18.1758ZM6.09082 12.9199C5.625 12.9199 5.25586 12.5508 5.25586 12.0762C5.25586 11.8652 5.34375 11.6543 5.51074 11.4961L7.90137 9.09668L5.51074 6.70605C5.34375 6.54785 5.25586 6.33691 5.25586 6.12598C5.25586 5.65137 5.625 5.29102 6.09082 5.29102C6.33691 5.29102 6.53027 5.37012 6.68848 5.52832L9.08789 7.91895L11.4961 5.51953C11.6719 5.35254 11.8564 5.27344 12.0938 5.27344C12.5596 5.27344 12.9287 5.64258 12.9287 6.1084C12.9287 6.32812 12.8408 6.52148 12.6738 6.69727L10.2832 9.09668L12.6738 11.4873C12.832 11.6543 12.9199 11.8564 12.9199 12.0762C12.9199 12.5508 12.5508 12.9199 12.0762 12.9199C11.8389 12.9199 11.6367 12.832 11.4697 12.6738L9.08789 10.292L6.70605 12.6738C6.54785 12.8408 6.33691 12.9199 6.09082 12.9199Z" fill="#1C1C1E" />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full pointer-events-auto relative">
      {options.length > 0 && (
        <div className="grid grid-cols-2 gap-2 w-full text-base md:text-sm px-4 pb-4">
          {options.map((option: string, index: number) => (
            <PrimaryButtonClicky
              key={index}
              buttonText={option}
              onPress={() => canReply && handleFilterUserMessageAndSend(option)}
              showKeyboardShortcut={false}
            />
          ))}
        </div>
      )}

      {messageCount === 0 && (
        <div className="w-full pb-2">
          <p className="font-rounded-bold mb-2">
            Get started
          </p>
          <div className="flex flex-row gap-1 overflow-x-auto snap-x snap-mandatory pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            <button
              className="bg-white rounded-[16px] flex flex-row items-center px-4 border border-[#F2F2F7] shrink-0 snap-start gap-4 text-left active:bg-[#F9F9FB]"
              style={{ width: '280px', height: '80px' }}
              onClick={() => canReply && handleFilterUserMessageAndSend('Help me upload a lecture slide and understand it')}
            >
              <img src="/assets/thumbnails/slide_thumbnail.png" className="w-[64px] h-[48px] object-cover shrink-0" />
              <div className="flex flex-col justify-center">
                <p className="font-rounded-bold text-[14px]">Understand lectures</p>
                <p className="text-[13px] text-[#595959]/50 leading-tight">Upload slides and ask questions</p>
              </div>
            </button>
            <button
              className="bg-white rounded-[16px] flex flex-row items-center px-4 border border-[#F2F2F7] shrink-0 snap-start gap-2 text-left active:bg-[#F9F9FB]"
              style={{ width: '280px', height: '80px' }}
              onClick={() => canReply && handleFilterUserMessageAndSend('Help me upload my assignment and start brainstorming')}
            >
              <img src="/assets/thumbnails/assignment_thumbnail.png" className="w-[48px] h-[48px] object-contain shrink-0" />
              <div className="flex flex-col">
                <p className="font-rounded-bold text-[14px]">Brainstorm essays</p>
                <p className="text-[13px] text-[#595959]/50 leading-tight">Plan your assignment</p>
              </div>
            </button>
            <button
              className="bg-white rounded-[16px] flex flex-row items-center px-4 border border-[#F2F2F7] shrink-0 snap-start gap-4 text-left active:bg-[#F9F9FB]"
              style={{ width: '280px', height: '80px' }}
              onClick={() => canReply && handleFilterUserMessageAndSend('Help me upload my lecture slides and create flashcards')}
            >
              <img src="/assets/thumbnails/flash_thumbnail.png" className="w-[56px] h-[56px] object-contain shrink-0" />
              <div className="flex flex-col">
                <p className="font-rounded-bold text-[14px]">Create flashcards</p>
                <p className="text-[13px] text-[#595959]/50 leading-tight">Turn slides into study cards</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* {shortcuts && shortcuts.length > 0 && (
        <div className="flex flex-col flex-wrap gap-2 w-full text-base md:text-sm pb-4">
          {shortcuts.map((shortcut: string, index: number) => (
            <button
              className="text-left font-rounded-semibold text-[14px] px-3 py-2 flex flex-row items-center gap-2 whitespace-nowrap border border-[#F2F2F7] rounded-[12px] hover:bg-[#F9F9FB] transition-colors"
              key={index} onClick={() => canReply && handleFilterUserMessageAndSend(shortcut)}>
              <svg width="16" height="16" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 3.18182V8.11998C15 10.1733 13.8898 11.2934 11.7728 11.2934H7.45266L5.01721 13.5164C4.65576 13.8473 4.44922 14 4.14802 14C3.71772 14 3.46816 13.6945 3.46816 13.2364V11.2934H3.22719C1.11016 11.2934 0 10.1733 0 8.11998V3.18182C0 1.12849 1.11016 0 3.22719 0H11.7728C13.8898 0 15 1.12849 15 3.18182ZM6.51463 8.42547C6.51463 8.85815 6.90189 9.19761 7.34079 9.19761C7.77108 9.19761 8.15834 8.86667 8.15834 8.42547C8.15834 7.99269 7.77968 7.65334 7.34079 7.65334C6.89329 7.65334 6.51463 8.00121 6.51463 8.42547ZM5.32702 3.19031C5.28399 3.3091 5.25817 3.43637 5.25817 3.55515C5.25817 3.90303 5.54216 4.0897 5.80034 4.0897C6.06712 4.0897 6.23924 3.96243 6.39414 3.79273L6.54045 3.61455C6.84164 3.24121 7.15145 3.09698 7.53872 3.09698C8.12392 3.09698 8.51118 3.42788 8.51118 3.92849C8.51118 4.39516 8.20137 4.59879 7.60756 5.01455C7.12564 5.34546 6.72116 5.71031 6.72116 6.42303C6.72116 6.43152 6.72116 6.45697 6.72116 6.46546C6.72116 6.88121 6.94492 7.08485 7.358 7.08485C7.76247 7.08485 8.00343 6.84727 8.00343 6.53333C8.00343 6.51636 8.00343 6.4994 8.00343 6.49091C8.00343 6.10909 8.23579 5.87151 8.70911 5.57455C9.37179 5.14182 9.9053 4.73455 9.9053 3.8691C9.9053 2.64728 8.81238 2.03636 7.59035 2.03636C6.35111 2.03636 5.54216 2.57939 5.32702 3.19031Z" fill={primaryColor || "#B7F652"} />
              </svg>
              {shortcut}
            </button>
          ))}
        </div>
      )} */}

      {/* Skill selection menu */}
      {
        showSkillMenu && (
          <div
            className={`absolute bottom-full -mb-2 ml-2 left-0 right-0 p-2 shadow-[0_0_16px_rgba(0,0,0,0.10)] rounded-[12px] font-rounded-bold text-[14px] text-black bg-white flex flex-col gap-1 pointer-events-auto transition-all duration-150 ease-out z-[12000] w-[320px] ${isSkillMenuAnimated ? "opacity-100 scale-100" : "opacity-0 scale-90"
              }`}
            style={{
              transformOrigin: "bottom center",
            }}
          >
            {filteredSkills.map((skill, index) => (
              <button
                key={index}
                onClick={() => handleSkillSelect(skill.name)}
                className={`text-left px-3 py-2 rounded-[8px] hover:bg-[#F2F2F7] transition-colors flex flex-col ${index === selectedSkillIndex ? "bg-[#F2F2F7]" : ""
                  }`}
              >
                <div className="font-rounded-bold text-[14px]">{skill.name}</div>
                <div className="font-medium text-[13px] text-[#595959]/80 mt-0.5">{skill.description}</div>
              </button>
            ))}
          </div>
        )
      }

      <div className={`pb-1 flex flex-col w-full rounded-[24px] pointer-events-auto ${highlightInput ? "border-2 border-[#1CA4FF]" : ""} ${backgroundColor ? `bg-[${backgroundColor}]` : ""} 
      ${style === "flat" ? "bg-[white] border border-white shadow-[0_0_10px_rgba(0,0,0,0.08)]" : "shadow-[0_0_10px_rgba(0,0,0,0.08)]"}`}>
        {/* Selected text row */}
        {(selectedText !== null && selectedText !== undefined) && selectedText.trim() && (
          <div className="px-2 pt-2 pb-1">
            <div className="group w-[200px] bg-[#F2F2F7] rounded-[12px] p-2 text-[14px] flex flex-row items-center gap-2 relative">
              <div
                className="absolute top-0 right-0 -mr-2 -mt-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (updateSelectedText) {
                    updateSelectedText(null);
                  }
                }}
              >
                <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.08789 18.1758C14.0713 18.1758 18.1846 14.0625 18.1846 9.08789C18.1846 4.11328 14.0625 0 9.0791 0C4.10449 0 0 4.11328 0 9.08789C0 14.0625 4.11328 18.1758 9.08789 18.1758ZM6.09082 12.9199C5.625 12.9199 5.25586 12.5508 5.25586 12.0762C5.25586 11.8652 5.34375 11.6543 5.51074 11.4961L7.90137 9.09668L5.51074 6.70605C5.34375 6.54785 5.25586 6.33691 5.25586 6.12598C5.25586 5.65137 5.625 5.29102 6.09082 5.29102C6.33691 5.29102 6.53027 5.37012 6.68848 5.52832L9.08789 7.91895L11.4961 5.51953C11.6719 5.35254 11.8564 5.27344 12.0938 5.27344C12.5596 5.27344 12.9287 5.64258 12.9287 6.1084C12.9287 6.32812 12.8408 6.52148 12.6738 6.69727L10.2832 9.09668L12.6738 11.4873C12.832 11.6543 12.9199 11.8564 12.9199 12.0762C12.9199 12.5508 12.5508 12.9199 12.0762 12.9199C11.8389 12.9199 11.6367 12.832 11.4697 12.6738L9.08789 10.292L6.70605 12.6738C6.54785 12.8408 6.33691 12.9199 6.09082 12.9199Z" fill="#1C1C1E" />
                </svg>
              </div>
              <div className="w-[32px] h-[40px] bg-white rounded-[8px] mr-1 border border-[#F2F2F7] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.08)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.9355 22.9971H22.0244C22.5166 22.9971 22.7715 22.7686 22.7715 22.373C22.7715 21.9688 22.5166 21.749 22.0244 21.749H20.2051V5.50684H22.0244C22.5166 5.50684 22.7715 5.28711 22.7715 4.87402C22.7715 4.47852 22.5166 4.26758 22.0244 4.26758H16.9355C16.4434 4.26758 16.1885 4.47852 16.1885 4.87402C16.1885 5.28711 16.4434 5.50684 16.9355 5.50684H18.7725V21.749H16.9355C16.4434 21.749 16.1885 21.9688 16.1885 22.373C16.1885 22.7686 16.4434 22.9971 16.9355 22.9971Z" fill="#595959" />
                  <path d="M4.52539 20.2373C5.12305 20.2373 5.43945 19.9912 5.63281 19.3584L6.59082 16.6514H11.6006L12.5586 19.3584C12.752 19.9912 13.0684 20.2373 13.666 20.2373C14.2988 20.2373 14.7031 19.8594 14.7031 19.2705C14.7031 19.0508 14.668 18.8662 14.5801 18.6201L10.7129 8.16113C10.4404 7.39648 9.93066 7.03613 9.10449 7.03613C8.31348 7.03613 7.80371 7.39648 7.54004 8.15234L3.64648 18.6729C3.55859 18.9014 3.52344 19.0947 3.52344 19.2881C3.52344 19.877 3.90137 20.2373 4.52539 20.2373ZM7.10059 14.999L9.07812 9.30371H9.13086L11.1084 14.999H7.10059Z" fill="#595959" />
                </svg>
              </div>
              <div className="flex flex-col overflow-hidden flex-1">
                <div className="truncate leading-none font-rounded-semibold">{selectedText.trim()}</div>
                <div className="text-[14px] mt-0.5 text-[#595959]/80">Selected text</div>
              </div>
            </div>
          </div>
        )}

        {/* Screenshot preview row */}
        {selectedScreenshot && (
          <div className="px-2 pt-2 pb-1">
            <div className="group w-[200px] bg-[#F2F2F7] rounded-[12px] p-2 text-[14px] flex flex-row items-center gap-2 relative">
              <div
                className="absolute top-0 right-0 -mr-2 -mt-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (updateSelectedScreenshot) {
                    updateSelectedScreenshot(null);
                  }
                }}
              >
                <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.08789 18.1758C14.0713 18.1758 18.1846 14.0625 18.1846 9.08789C18.1846 4.11328 14.0625 0 9.0791 0C4.10449 0 0 4.11328 0 9.08789C0 14.0625 4.11328 18.1758 9.08789 18.1758ZM6.09082 12.9199C5.625 12.9199 5.25586 12.5508 5.25586 12.0762C5.25586 11.8652 5.34375 11.6543 5.51074 11.4961L7.90137 9.09668L5.51074 6.70605C5.34375 6.54785 5.25586 6.33691 5.25586 6.12598C5.25586 5.65137 5.625 5.29102 6.09082 5.29102C6.33691 5.29102 6.53027 5.37012 6.68848 5.52832L9.08789 7.91895L11.4961 5.51953C11.6719 5.35254 11.8564 5.27344 12.0938 5.27344C12.5596 5.27344 12.9287 5.64258 12.9287 6.1084C12.9287 6.32812 12.8408 6.52148 12.6738 6.69727L10.2832 9.09668L12.6738 11.4873C12.832 11.6543 12.9199 11.8564 12.9199 12.0762C12.9199 12.5508 12.5508 12.9199 12.0762 12.9199C11.8389 12.9199 11.6367 12.832 11.4697 12.6738L9.08789 10.292L6.70605 12.6738C6.54785 12.8408 6.33691 12.9199 6.09082 12.9199Z" fill="#1C1C1E" />
                </svg>
              </div>
              <div className="w-[40px] h-[40px] rounded-[8px] overflow-hidden border border-[#E0E0E0] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.08)]">
                <img
                  src={selectedScreenshot.dataUrl}
                  alt="Selection"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col overflow-hidden flex-1">
                <div className="truncate leading-none font-rounded-semibold">Screenshot</div>
                <div className="text-[12px] mt-0.5 text-[#595959]/80">Image</div>
              </div>
            </div>
          </div>
        )}

        {/* Dragged context items row */}
        {draggedContexts && draggedContexts.length > 0 && (
          <div className="px-2 pt-2 pb-1 flex flex-wrap gap-2">
            {draggedContexts.map((item) => (
              <div key={item.id} className="group bg-[#F2F2F7] rounded-[12px] p-2 text-[14px] flex flex-row items-center gap-2 relative max-w-[200px]">
                <div
                  className="absolute top-0 right-0 -mr-2 -mt-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDraggedContext?.(item.id);
                  }}
                >
                  <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.08789 18.1758C14.0713 18.1758 18.1846 14.0625 18.1846 9.08789C18.1846 4.11328 14.0625 0 9.0791 0C4.10449 0 0 4.11328 0 9.08789C0 14.0625 4.11328 18.1758 9.08789 18.1758ZM6.09082 12.9199C5.625 12.9199 5.25586 12.5508 5.25586 12.0762C5.25586 11.8652 5.34375 11.6543 5.51074 11.4961L7.90137 9.09668L5.51074 6.70605C5.34375 6.54785 5.25586 6.33691 5.25586 6.12598C5.25586 5.65137 5.625 5.29102 6.09082 5.29102C6.33691 5.29102 6.53027 5.37012 6.68848 5.52832L9.08789 7.91895L11.4961 5.51953C11.6719 5.35254 11.8564 5.27344 12.0938 5.27344C12.5596 5.27344 12.9287 5.64258 12.9287 6.1084C12.9287 6.32812 12.8408 6.52148 12.6738 6.69727L10.2832 9.09668L12.6738 11.4873C12.832 11.6543 12.9199 11.8564 12.9199 12.0762C12.9199 12.5508 12.5508 12.9199 12.0762 12.9199C11.8389 12.9199 11.6367 12.832 11.4697 12.6738L9.08789 10.292L6.70605 12.6738C6.54785 12.8408 6.33691 12.9199 6.09082 12.9199Z" fill="#1C1C1E" />
                  </svg>
                </div>
                <div className="w-[32px] h-[40px] bg-white rounded-[8px] mr-1 border border-[#F2F2F7] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.08)] flex items-center justify-center">
                  {item.type === "folder" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke="#595959" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#595959" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 2V8H20" stroke="#595959" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col overflow-hidden flex-1">
                  <div className="truncate leading-none font-rounded-semibold">{item.name}</div>
                  <div className="text-[12px] mt-0.5 text-[#595959]/80">
                    {item.type === "folder" ? "Folder" : (item.documentType || "Document")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Row 1: Text input */}
        <div className="flex items-center w-full min-h-[40px] px-4 pt-2 relative">
          {currentSkill && <SkillContainer skillName={currentSkill} />}

          <textarea
            ref={inputRef}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            maxLength={1024}
            id="userInput"
            name="userInput"
            disabled={!canReply}
            placeholder={currentSkill ? "" : placeholder}
            value={userInput}
            className={`w-full bg-transparent outline-none py-2 text-[15px] md:text-sm resize-none overflow-hidden font-rounded-semibold min-h-[40px] ${!canReply ? 'placeholder:text-black/20' : 'placeholder:text-black/40'}`}
            rows={1}
            onChange={(e) => {
              const value = e.target.value;

              // Handle skill menu logic
              if (value.startsWith('/')) {
                const searchText = value.slice(1); // Remove the '/' prefix
                setSkillSearchText(searchText);
                setShowSkillMenu(true);
                setUserInput(value);
                adjustHeight(e.target);
              } else {
                // Close menu if user removes the '/'
                if (showSkillMenu) {
                  setShowSkillMenu(false);
                  setSkillSearchText('');
                }
                setUserInput(value);
                adjustHeight(e.target);
              }
            }}
          />
        </div>

        {/* Hidden file input for document upload */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={SUPPORTED_FILE_ACCEPT}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onFileSelect) {
              onFileSelect(file);
            }
            e.target.value = ""; // Reset for re-selection
          }}
        />

        {/* Row 2: Context pills on left, send button on right */}
        <div className="flex items-center justify-between w-full px-3 pb-2 pt-1">
          {/* Left side: Context pills */}
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {/* Show folder pill if document is in a folder */}
            {currentFolderName && (
              <div className="flex items-center gap-1.5 text-[14px] font-rounded-semibold text-[#595959]/50 border border-[#F2F2F7] rounded-full px-3 py-1.5 min-w-0">
                <FolderIcon />
                <span className="truncate">{currentFolderName}</span>
              </div>
            )}

            {/* Show document pill if document is open, OR show "Add docs" if no doc open */}
            {currentDocumentName ? (
              <div className="flex items-center gap-1.5 text-[14px] font-rounded-semibold text-[#595959]/50 border border-[#F2F2F7] rounded-full px-3 py-1.5 min-w-0">
                <DocumentTypeChip type={currentDocumentType} label={currentDocumentLabel} size="small" />
                <span className="truncate max-w-[120px]">{currentDocumentName}</span>
              </div>
            ) : (
              <button
                className="flex items-center gap-1.5 text-[14px] font-rounded-semibold text-[#595959]/50 border border-[#F2F2F7] rounded-full px-3 py-1.5 hover:bg-[#F2F2F7] active:bg-[#E5E5EA] disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Spinner size="small" style="dark" /> : <PlusIcon />}
                {isUploading ? "Uploading..." : "Add docs"}
              </button>
            )}

            {/* + button next to document pill when a doc is open */}
            {currentDocumentName && (
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full border border-[#F2F2F7] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Spinner size="small" style="dark" />
                ) : (
                  <PlusIcon />
                )}
              </button>
            )}
          </div>

          {/* Right side: Send button */}
          <button
            className={`w-[32px] h-[32px] rounded-full flex flex-col justify-center items-center`}
            disabled={!canReply}
            onClick={() => {
              if (canReply) {
                // Check if current skill has autoSend enabled
                if (currentSkill) {
                  const skill = skills.find(s => s.name === currentSkill);
                  if (skill?.autoSend) {
                    // Auto-send without waiting for user input
                    const messageToSend = `/${currentSkill}`;
                    handleFilterUserMessageAndSend(messageToSend);
                    setUserInput("");
                    if (updateCurrentSkill) {
                      updateCurrentSkill(null);
                    }
                    if (updateCurrentSkillPrompt) {
                      updateCurrentSkillPrompt(null);
                    }
                    // Reset textarea height after sending
                    if (inputRef.current) {
                      inputRef.current.style.height = "40px";
                    }
                    return;
                  }
                }

                // Normal send behavior for non-autoSend skills or no skill
                const messageToSend = currentSkill ? `/${currentSkill} ${userInput}` : userInput;
                handleFilterUserMessageAndSend(messageToSend);
                setUserInput("");
                if (updateCurrentSkill) {
                  updateCurrentSkill(null);
                }
                if (updateCurrentSkillPrompt) {
                  updateCurrentSkillPrompt(null);
                }
                // Reset textarea height after sending
                if (inputRef.current) {
                  inputRef.current.style.height = "40px";
                }
              }
            }}
          >
            {canReply ? (
              <ArrowIcon
                backgroundColor={canReply && userInput.trim().length > 0 ? "#00AEFF" : "#EBEBEB"}
                fillColor={canReply && userInput.trim().length > 0 ? "white" : "#7A7A7A"}
              />
            ) :
              (
                <div className="w-6 h-6 rounded-full flex flex-col items-center justify-center bg-[#B3B3B3]">
                  <Spinner size="small" style="light" />
                </div>
              )
            }
          </button>
        </div>
      </div>
    </div >
  );
}

export default InputBar;