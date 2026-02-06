import { UnitWithTopics } from "@/app/types/types";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

const Search = ({
  searchTerm,
  setSearchTerm,
  setFilteredUnits,
  originalUnits,
}: {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  setFilteredUnits: (filteredUnits: UnitWithTopics[]) => void;
  originalUnits: UnitWithTopics[];
}) => {
  const searchTerms = searchTerm
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // Filter function that checks if text matches the search terms
  const matchesSearch = (text: string) => {
    if (searchTerms.length === 0) return true;
    const normalizedText = text.toLowerCase();
    return searchTerms.every((term) => normalizedText.includes(term));
  };

  const filterUnits = () => {
    if (searchTerms.length === 0) {
      return originalUnits;
    }

    // Filter units, topics, and lessons based on search
    return (
      originalUnits
        .map((unit) => {
          const unitMatches = matchesSearch(unit.title);

          const topicsWithMatchStatus = unit.topics.map((topic) => {
            const topicMatches = matchesSearch(topic.title);

            const lessonsWithMatchStatus = topic.lessons.map((lesson) => ({
              ...lesson,
              matches: matchesSearch(lesson.title),
            }));

            const hasMatchingLessons = lessonsWithMatchStatus.some(
              (lesson) => lesson.matches
            );

            return {
              ...topic,
              matches: topicMatches,
              lessons: lessonsWithMatchStatus,
              hasMatchingLessons,
            };
          });

          // If the unit matches, keep all its topics and lessons
          if (unitMatches) {
            return {
              ...unit,
              matches: true,
              topics: unit.topics,
              shouldShow: true,
            };
          }

          // Otherwise, only keep topics that match or have matching lessons
          const matchingTopics = topicsWithMatchStatus
            .map((topic) => {
              if (topic.matches) {
                // If topic matches, keep all its lessons
                return {
                  ...topic,
                  lessons: topic.lessons.map((l) => ({ ...l, matches: false })),
                  shouldShow: true,
                };
              } else if (topic.hasMatchingLessons) {
                // If any lesson matches, keep only matching lessons
                return {
                  ...topic,
                  lessons: topic.lessons.filter((l) => l.matches),
                  shouldShow: true,
                };
              }
              return {
                ...topic,
                shouldShow: false,
              };
            })
            .filter((topic) => topic.shouldShow);

          return {
            ...unit,
            matches: false,
            topics: matchingTopics,
            shouldShow: matchingTopics.length > 0,
          };
        })
        .filter((unit) => unit.shouldShow) || []
    );
  };

  // Update filtered units whenever search term changes
  useEffect(() => {
    setFilteredUnits(filterUnits());
  }, [searchTerm, originalUnits]);

  return (
    <div className="mt-6 mb-4 relative">
      <div className="md:w-[480px]">
        <input
          type="text"
          placeholder="Search units, topics, or lessons"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
          }}
          className="w-full py-2 pl-10 pr-4 border rounded-full focus:outline-none"
        />
        <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
};

export default Search;
