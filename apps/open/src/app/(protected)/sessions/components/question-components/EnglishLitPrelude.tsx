import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import { QuestionWithMarkingResult } from "@/app/types/types";

const EnglishLitPrelude = ({
  currentQuestionIndex,
  currentEngLitPartIndex,
  setCurrentEngLitPartIndex,
  currentQuestionWithMarkingResult,
  isReadOnly,
}: {
  currentQuestionIndex: number;
  currentEngLitPartIndex: number;
  setCurrentEngLitPartIndex: (index: number) => void;
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  isReadOnly: boolean;
}) => {
  if (currentQuestionWithMarkingResult.legacyId.includes("aqaGCSEEngLit_1")) {
    return (
      <div className="flex flex-col gap-2 px-10 pt-5 bg-white mb-10">
        <div className="flex flex-col items-center gap-2 py-5 border-b border-t border-black">
          <div className="text-base font-heavy flex justify-start">
            {" "}
            Section{" "}
            {String.fromCharCode(97 + currentQuestionIndex).toUpperCase()}:{" "}
            {currentQuestionIndex == 0
              ? "Shakespeare"
              : "The 19th-century novel"}
          </div>
          <div className="text-base flex justify-start mb-4">
            {" "}
            Select <span className="font-heavy mx-1">one</span> of the following
            texts and answer the question.{" "}
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-center">
            {(currentQuestionIndex == 0
              ? [
                  "Macbeth",
                  "Romeo and Juliet",
                  "The Tempest",
                  "The Merchant of Venice",
                  "Much Ado About Nothing",
                  "Julius Caesar",
                ]
              : [
                  "The Strange Case of Dr. Jekyll and Mr. Hyde",
                  "A Christmas Carol",
                  "Great Expectations",
                  "Jane Eyre",
                  "Frankenstein",
                  "Pride and Prejudice",
                  "The Sign of Four",
                ]
            ).map((option, index) => (
              <PrimaryButtonClicky
                key={option}
                buttonText={`${option}`}
                showKeyboardShortcut={false}
                buttonState={
                  index === currentEngLitPartIndex ? "selected" : undefined
                }
                onPress={() => {
                  setCurrentEngLitPartIndex(index);
                }}
                disabled={isReadOnly}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (
    currentQuestionWithMarkingResult.legacyId.includes("aqaGCSEEngLit_2") &&
    currentQuestionIndex !== 2
  ) {
    return (
      <div className="flex flex-col gap-2 px-10 pt-5 bg-white mb-10">
        <div className="flex flex-col items-center gap-2 py-5 border-b border-t border-black">
          {currentQuestionWithMarkingResult.legacyId.includes("aqa") && (
            <div className="text-base font-heavy flex justify-start">
              {" "}
              Section{" "}
              {String.fromCharCode(
                97 + currentQuestionIndex
              ).toUpperCase()}:{" "}
              {currentQuestionIndex == 0
                ? "Modern prose or drama"
                : currentQuestionIndex == 1
                  ? "Poetry"
                  : "Unseen Poetry"}
            </div>
          )}
          <div className="text-base flex justify-start mb-4">
            {" "}
            Select <span className="font-heavy mx-1">one</span> of the following
            texts and answer the question.{" "}
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-center">
            {(currentQuestionIndex == 0
              ? [
                  "J.B. Priestley: An Inspector Calls",
                  "Willy Russell: Blood Brothers",
                  "Dennis Kelly: DNA",
                  "Shelagh Delaney: A Taste of Honey",
                  "Chinonyerem Odimba: Princess & The Hustler",
                  "Winsome Pinnock: Leave Taking",
                  "William Golding: Lord of the Flies",
                  "Telling Tales",
                  "George Orwell: Animal Farm",
                  "Meera Syal: Anita and Me",
                  "Stephen Kelman: Pigeon English",
                  "Kit de Waal: My Name is Leon",
                ]
              : [
                  "Love and Relationships Collection",
                  "Power and Conflict",
                  "Worlds and Lives",
                ]
            ).map((option, index) => (
              <PrimaryButtonClicky
                key={option}
                buttonText={`${option}`}
                showKeyboardShortcut={false}
                buttonState={
                  index === currentEngLitPartIndex ? "selected" : undefined
                }
                onPress={() => {
                  setCurrentEngLitPartIndex(index);
                }}
                disabled={isReadOnly}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (
    currentQuestionWithMarkingResult.legacyId.includes("aqaGCSEEngLit_2") &&
    currentQuestionIndex === 2
  ) {
    return (
      <div className="flex flex-col gap-2 px-10 pt-5 bg-white mb-10">
        <div className="flex flex-col items-center gap-2 py-5 border-b border-t border-black">
          {currentQuestionWithMarkingResult.legacyId.includes("aqa") && (
            <div className="text-base font-heavy flex justify-start">
              {" "}
              Section C: Unseen poetry
            </div>
          )}
          <div className="text-base flex justify-start">
            {" "}
            Answer <span className="font-heavy mx-1">both</span> questions in
            this section.
          </div>
        </div>
      </div>
    );
  }

  if (
    currentQuestionWithMarkingResult.legacyId.includes("edexcelGCSEEngLit_1")
  ) {
    return (
      <div className="flex flex-col gap-2 px-10 pt-5 bg-white mb-10">
        <div className="flex flex-col items-center gap-2 py-5 border-b border-t border-black">
          <div className="text-base font-heavy flex justify-start">
            {" "}
            Section{" "}
            {String.fromCharCode(97 + currentQuestionIndex).toUpperCase()}:{" "}
            {currentQuestionIndex == 0
              ? "Shakespeare"
              : "Post-1914 Literature – British Play OR British Novel"}
          </div>
          <div className="text-base flex justify-start mb-4">
            {" "}
            Select <span className="font-heavy mx-1">one</span> of the following
            texts and answer{" "}
            <span className="font-heavy mx-1">
              {currentQuestionIndex == 0 ? "both" : "one"}
            </span>{" "}
            question(s).{" "}
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-center">
            {(currentQuestionIndex == 0
              ? [
                  "Macbeth",
                  "The Tempest",
                  "Romeo and Juliet",
                  "Much Ado About Nothing",
                  "Twelfth Night",
                  "The Merchant of Venice",
                ]
              : [
                  "BRITISH PLAY: An Inspector Calls by J.B. Priestley",
                  "BRITISH PLAY: Hobson's Choice by Harold Brighouse",
                  "BRITISH PLAY: Blood Brothers by Willy Russell",
                  "BRITISH PLAY: Journey's End by R.C. Sherriff",
                  "BRITISH NOVEL: Animal Farm by George Orwell",
                  "BRITISH NOVEL: Lord of the Flies by William Golding",
                  "BRITISH NOVEL: Anita and Me by Meera Syal",
                  "BRITISH NOVEL: The Woman in Black by Susan Hill",
                  "BRITISH PLAY: The Empress by Tanika Gupta",
                  "BRITISH NOVEL: Refugee Boy by Benjamin Zephaniah",
                  "BRITISH NOVEL: Coram Boy by Jamila Gavin",
                  "BRITISH NOVEL: Boys Don't Cry by Malorie Blackman",
                ]
            ).map((option, index) => (
              <PrimaryButtonClicky
                key={option}
                buttonText={`${option}`}
                showKeyboardShortcut={false}
                buttonState={
                  currentQuestionIndex == 0
                    ? index === currentEngLitPartIndex / 2
                      ? "selected"
                      : undefined
                    : index === currentEngLitPartIndex
                      ? "selected"
                      : undefined
                }
                onPress={() => {
                  if (currentQuestionIndex == 0) {
                    setCurrentEngLitPartIndex(index * 2);
                  } else {
                    setCurrentEngLitPartIndex(index);
                  }
                }}
                disabled={isReadOnly}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (
    currentQuestionWithMarkingResult.legacyId.includes("edexcelGCSEEngLit_2") &&
    currentQuestionIndex !== 2
  ) {
    return (
      <div className="flex flex-col gap-2 px-10 pt-5 bg-white mb-10">
        <div className="flex flex-col items-center gap-2 py-5 border-b border-t border-black">
          <div className="text-base font-heavy flex justify-start">
            {" "}
            Section{" "}
            {currentQuestionIndex == 0
              ? "A: 19th-Century Novel"
              : "B, Part 1: Poetry Anthology"}
          </div>
          <div className="text-base flex justify-start mb-4">
            {" "}
            Select <span className="font-heavy mx-1">one</span> of the following
            texts and answer{" "}
            <span className="font-heavy mx-1">
              {currentQuestionIndex == 0 ? "both" : "one"}
            </span>{" "}
            question(s).{" "}
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-center">
            {(currentQuestionIndex == 0
              ? [
                  "Jane Eyre",
                  "Great Expectations",
                  "The Strange Case of Dr. Jekyll and Mr. Hyde",
                  "A Christmas Carol",
                  "Pride and Prejudice",
                  "Silas Marner",
                  "Frankenstein",
                ]
              : [
                  "Relationships Collection",
                  "Conflict Collection",
                  "Time and Place Collection",
                  "Belonging Collection",
                ]
            ).map((option, index) => (
              <PrimaryButtonClicky
                key={option}
                buttonText={`${option}`}
                showKeyboardShortcut={false}
                buttonState={
                  currentQuestionIndex == 0
                    ? index === currentEngLitPartIndex / 2
                      ? "selected"
                      : undefined
                    : index === currentEngLitPartIndex
                      ? "selected"
                      : undefined
                }
                onPress={() => {
                  if (currentQuestionIndex == 0) {
                    setCurrentEngLitPartIndex(index * 2);
                  } else {
                    setCurrentEngLitPartIndex(index);
                  }
                }}
                disabled={isReadOnly}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (
    currentQuestionWithMarkingResult.legacyId.includes("edexcelGCSEEngLit_2") &&
    currentQuestionIndex === 2
  ) {
    return (
      <div className="flex flex-col gap-2 px-10 pt-5 bg-white mb-10">
        <div className="flex flex-col items-center gap-2 py-5 border-b border-t border-black">
          <div className="text-base font-heavy flex justify-start">
            {" "}
            Section B, Part 2: Unseen poetry
          </div>
          <div className="text-base flex justify-start">
            {" "}
            Read the two poems and answer the question in this section.
          </div>
        </div>
      </div>
    );
  }
};

export default EnglishLitPrelude;
