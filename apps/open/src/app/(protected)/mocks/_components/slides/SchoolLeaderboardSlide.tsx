import { useState } from "react";
import schools from "../../_constants/schools.json";
import PlusCircleIcon from "@/app/_components/icons/PlusCircleIcon";
import MagnifyingGlassIcon from "@/app/_components/icons/MagnifyingGlassIcon";
import CrossIcon from "@/app/_components/icons/CrossIcon";

type School = (typeof schools)[0];

const SchoolLeaderboardSlide = ({
  onSchoolChange,
}: {
  onSchoolChange: (school: School | null) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<typeof schools>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    if (selectedSchool) {
      setSelectedSchool(null);
      onSchoolChange(null);
    }

    const results = schools.filter((school) =>
      school.school_name.toLowerCase().includes(value.toLowerCase())
    );
    setSearchResults(results.slice(0, 3)); // Limit to 5 results
  };

  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    setSearchTerm(school.school_name);
    setSearchResults([]);
    onSchoolChange(school);
  };

  const handleClear = () => {
    setSelectedSchool(null);
    setSearchTerm("");
    setSearchResults([]);
    onSchoolChange(null);
  };

  const handleAddSchool = () => {
    const newSchool: School = {
      id: Date.now().toString(),
      school_name: searchTerm,
      location: {
        street: "",
        locality: "",
        town: "",
        postcode: "",
      },
    };
    setSearchResults([]);
    handleSelectSchool(newSchool);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto my-16">
      <div className="relative">
        <div className="absolute left-6 top-1/2 -translate-y-1/2">
          {selectedSchool ? (
            <span className="text-3xl">🏫</span>
          ) : (
            <MagnifyingGlassIcon className="h-8 w-8" fill="#FFAFBB" />
          )}
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="bg-white text-[#FFAFBB] rounded-full px-16 py-4 text-4xl font-bold w-full shadow-lg"
          placeholder="Search your school"
        />
        {selectedSchool && (
          <button
            onClick={handleClear}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-[#FFAFBB] hover:text-[#FFAFBB]/80"
          >
            <CrossIcon color="#FFAFBB" />
          </button>
        )}
      </div>
      {!selectedSchool &&
        (searchResults.length > 0 || searchTerm.length >= 2) && (
          <div className="absolute top-20 left-0 right-0 text-left bg-white rounded-3xl p-2 shadow-lg overflow-hidden z-50">
            {searchResults.map((school) => (
              <div
                key={school.id}
                onClick={() => handleSelectSchool(school)}
                className="px-6 py-4 hover:bg-[#FFE5E9] cursor-pointer text-[#FFAFBB] text-2xl rounded-xl font-medium transition-colors"
              >
                {school.school_name}
              </div>
            ))}
            {searchTerm.length >= 2 && (
              <div
                onClick={handleAddSchool}
                className="px-6 py-4 hover:bg-[#FFE5E9] cursor-pointer text-[#FFAFBB] text-2xl rounded-xl font-medium flex items-center gap-3 transition-colors"
              >
                <PlusCircleIcon className="w-8 h-8" />
                <span>Add {searchTerm}</span>
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default SchoolLeaderboardSlide;
