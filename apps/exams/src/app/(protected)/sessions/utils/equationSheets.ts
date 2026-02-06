import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";

// Minimal mapping for GCSE and A-Level equation/data sheets
type EquationSheetMapping = {
  [examBoard: string]: {
    [subjectKey: string]: { [tier: string]: string };
  };
};

const equationSheets: EquationSheetMapping = {
  AQA: {
    "GCSE Physics": {
      Foundation:
        "https://cdn.sanity.io/files/p28bar15/green/9ed67743e67af60cd83b2b65a90d01a21223f52c.pdf",
      Higher:
        "https://cdn.sanity.io/files/p28bar15/green/9ed67743e67af60cd83b2b65a90d01a21223f52c.pdf",
    },
    "GCSE Combined Physics": {
      Foundation:
        "https://cdn.sanity.io/files/p28bar15/green/aa2a324e64b5a673c1f7e4c916d2cda61e54ef08.pdf",
      Higher:
        "https://cdn.sanity.io/files/p28bar15/green/aa2a324e64b5a673c1f7e4c916d2cda61e54ef08.pdf",
    },
    "GCSE Maths": {
      Foundation:
        "https://filestore.aqa.org.uk/resources/mathematics/AQA-8300F-FS-INS-2024.PDF",
      Higher:
        "https://filestore.aqa.org.uk/resources/mathematics/AQA-8300H-FS-INS-2024.PDF",
    },
    "A-Level Maths": {
      "": "https://cdn.sanity.io/files/p28bar15/green/ec733ab43920b5a858a8e9a0527942fbc7c21abc.pdf",
    },
    "A-Level Physics": {
      "": "https://cdn.sanity.io/files/p28bar15/green/892b126c5e5195d391f0d07e735bbc4877bf1831.pdf",
    },
  },
  Edexcel: {
    "GCSE Physics": {
      Foundation:
        "https://qualifications.pearson.com/content/dam/pdf/GCSE/Science/2016/teaching-and-learning-materials/gcse-physics-exam-aid-1ph01sc0.pdf",
      Higher:
        "https://qualifications.pearson.com/content/dam/pdf/GCSE/Science/2016/teaching-and-learning-materials/gcse-physics-exam-aid-1ph01sc0.pdf",
    },
    "IGCSE Physics": {
        "": "https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/teaching-and-learning-materials/int-gcse-physics-4ph1-science-double-award-4ds0-equation-sheet.pdf",
    },
    "GCSE Combined Physics": {
      Foundation:
        "https://qualifications.pearson.com/content/dam/pdf/GCSE/Science/2016/teaching-and-learning-materials/gcse-physics-exam-aid-1ph01sc0.pdf",
      Higher:
        "https://qualifications.pearson.com/content/dam/pdf/GCSE/Science/2016/teaching-and-learning-materials/gcse-physics-exam-aid-1ph01sc0.pdf",
    },
    "GCSE Maths": {
      Foundation:
        "https://qualifications.pearson.com/content/dam/pdf/GCSE/mathematics/2015/teaching-and-learning-materials/gcse-mathematics-1ma1-exam-aid-1f2f3f-june2025.pdf",
      Higher:
        "https://qualifications.pearson.com/content/dam/pdf/GCSE/mathematics/2015/teaching-and-learning-materials/gcse-mathematics-1ma1-exam-aid-1h2h3h-june2025.pdf",
    },
    "A-Level Maths": {
      "": "https://qualifications.pearson.com/content/dam/pdf/A%20Level/Mathematics/2017/specification-and-sample-assesment/pearson-edexcel-a-level-gce-in-mathematics-formulae-book.pdf",
    },
    "A-Level Physics": {
      "": "https://qualifications.pearson.com/content/dam/pdf/A%20Level/Physics/2015/Specification%20and%20sample%20assessments/a-level-physics-data-formulae-relationships.pdf",
    },
  },
  OCR: {
    "A-Level Maths": {
      "": "https://files.revisely.com/documents/alevel/other/ocr-maths-formulae-booklet.pdf",
    },
    "A-Level Physics": {
      "": "https://www.ocr.org.uk/Images/621261-data-booklet-physics-a-cst992-.pdf",
    },
  },
  CIE: {
    "CIE A-Level Maths": {
      "": "https://www.cambridgeinternational.org/Images/417318-list-of-formulae-and-statistical-tables.pdf",
    },
  },
};

export function getEquationSheetUrlBySubjectId(
  subjectLegacyId: string,
  gcseHigher?: boolean
): string | null {
  if (!subjectLegacyId) return null;

  const { examBoard, course, subjectTitle } =
    deconstructSubjectLegacyId(subjectLegacyId);

  // Supported boards only
  const supportedBoards = new Set(["AQA", "Edexcel", "OCR", "CIE"]);
  if (!supportedBoards.has(examBoard)) return null;

  // Only GCSE and A-Level
  const normalizedCourse =
    course === "GCSE" || course === "A-Level" ? course : "";
  if (!normalizedCourse) return null;

  const subjectKey = `${normalizedCourse} ${subjectTitle}`.trim();
  const examBoardSheets = equationSheets[examBoard];
  const subjectSheets = examBoardSheets?.[subjectKey];
  if (!subjectSheets) return null;

  if (normalizedCourse === "GCSE") {
    const tier =
      gcseHigher === true
        ? "Higher"
        : gcseHigher === false
        ? "Foundation"
        : null;
    if (!tier) return null;
    return subjectSheets[tier] || null;
  }

  if (normalizedCourse === "A-Level") {
    return subjectSheets[""] || null;
  }

  return null;
}
