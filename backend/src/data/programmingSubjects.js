export const programmingSubjects = [
  {
    slug: 'c-programming',
    title: 'C Programming',
    color: '#f97316',
    description: 'Build strong fundamentals with memory, control flow, functions, and pointers.',
    lessons: [
      ['c-hello-world', 'Getting Started with C', 'Setup, hello world, compilation flow', 'https://www.youtube.com/embed/KJgsSFOSQv0', ['compiler', 'main function', 'printf']],
      ['c-variables', 'Variables and Data Types', 'Numbers, characters, constants, and type conversion', 'https://www.youtube.com/embed/irqbmMNs2Bo', ['variables', 'data types', 'type conversion']],
      ['c-control-flow', 'Decision Making', 'if, else, switch, and boolean expressions', 'https://www.youtube.com/embed/eKqY-oP1d_Y', ['if else', 'switch', 'conditions']],
      ['c-loops', 'Loops in C', 'for, while, do while, and loop tracing', 'https://www.youtube.com/embed/BpeI5RqvB4k', ['for loop', 'while loop', 'iteration']],
      ['c-functions', 'Functions', 'Parameters, return values, scope, and reuse', 'https://www.youtube.com/embed/5_5oE5lgrhw', ['function', 'parameters', 'return value']],
      ['c-arrays', 'Arrays', 'Indexing, traversal, searching, and common mistakes', 'https://www.youtube.com/embed/7F-Q2oVBYKk', ['arrays', 'indexing', 'linear search']],
      ['c-pointers', 'Pointers', 'Addresses, dereferencing, and pointer safety', 'https://www.youtube.com/embed/zuegQmMdy8M', ['pointers', 'address', 'dereference']],
      ['c-structs', 'Structures', 'Grouping data, nested structures, and simple records', 'https://www.youtube.com/embed/qqtmtuedaBM', ['struct', 'records', 'member access']],
    ],
  },
  {
    slug: 'python-programming',
    title: 'Python Programming',
    color: '#2563eb',
    description: 'Learn expressive programming through scripts, functions, collections, and files.',
    lessons: [
      ['py-start', 'Python Setup and First Script', 'Interpreter, print, comments, and running files', 'https://www.youtube.com/embed/kqtD5dpn9C8', ['interpreter', 'print', 'script']],
      ['py-variables', 'Variables and Types', 'Dynamic typing, strings, numbers, and booleans', 'https://www.youtube.com/embed/cQT33yu9pY8', ['variables', 'strings', 'numbers']],
      ['py-conditions', 'Conditions', 'if, elif, else, comparisons, and truthiness', 'https://www.youtube.com/embed/DZwmZ8Usvnk', ['if elif else', 'comparison', 'truthy']],
      ['py-loops', 'Loops and Ranges', 'for, while, range, break, and continue', 'https://www.youtube.com/embed/94UHCEmprCY', ['for loop', 'while loop', 'range']],
      ['py-functions', 'Functions', 'Arguments, return values, default parameters', 'https://www.youtube.com/embed/9Os0o3wzS_I', ['functions', 'arguments', 'return']],
      ['py-lists', 'Lists and Tuples', 'Indexing, slicing, mutation, and iteration', 'https://www.youtube.com/embed/W8KRzm-HUcc', ['lists', 'tuples', 'slicing']],
      ['py-dicts', 'Dictionaries and Sets', 'Key-value data, lookup, uniqueness, and counting', 'https://www.youtube.com/embed/daefaLgNkw0', ['dictionary', 'set', 'lookup']],
      ['py-files', 'Files and Exceptions', 'Reading files, writing files, try except', 'https://www.youtube.com/embed/Uh2ebFW8OYM', ['files', 'exceptions', 'try except']],
    ],
  },
  {
    slug: 'java-programming',
    title: 'Java Programming',
    color: '#16a34a',
    description: 'Practice class-based programming with types, methods, objects, and collections.',
    lessons: [
      ['java-start', 'Java Setup and Hello World', 'JDK, class structure, main method, and compilation', 'https://www.youtube.com/embed/eIrMbAQSU34', ['JDK', 'class', 'main method']],
      ['java-variables', 'Variables and Primitive Types', 'int, double, boolean, char, and type rules', 'https://www.youtube.com/embed/so1iUWaLmKA', ['variables', 'primitive types', 'type casting']],
      ['java-conditions', 'Conditional Logic', 'if, else, switch, and logical operators', 'https://www.youtube.com/embed/O5hShUO6wxs', ['if else', 'switch', 'logical operators']],
      ['java-loops', 'Loops', 'for, while, enhanced for, and loop patterns', 'https://www.youtube.com/embed/6djggrlkHY8', ['for loop', 'while loop', 'enhanced for']],
      ['java-methods', 'Methods', 'Static methods, parameters, return values, and overloads', 'https://www.youtube.com/embed/pTAda7qU4LY', ['methods', 'parameters', 'overloading']],
      ['java-arrays', 'Arrays', 'Fixed-size collections, traversal, and searching', 'https://www.youtube.com/embed/NTHVTY6w2Co', ['arrays', 'indexing', 'search']],
      ['java-oop', 'Classes and Objects', 'Fields, constructors, methods, and object state', 'https://www.youtube.com/embed/IJDJ0kBx2LM', ['objects', 'constructors', 'fields']],
      ['java-collections', 'ArrayList Basics', 'Dynamic lists, add, get, remove, and iteration', 'https://www.youtube.com/embed/Nv2DERaMx-4', ['ArrayList', 'collections', 'iteration']],
    ],
  },
]

export const buildLessonSeed = () =>
  programmingSubjects.flatMap((subject) =>
    subject.lessons.map(([slug, title, summary, videoUrl, concepts], index) => ({
      slug,
      class: 'Programming MVP',
      subject: subject.title,
      subjectSlug: subject.slug,
      chapter: index < 3 ? 'Foundations' : index < 6 ? 'Core Skills' : 'Applied Programming',
      title,
      content: summary,
      videoUrl,
      concepts,
      difficulty: index < 3 ? 'Beginner' : index < 6 ? 'Intermediate' : 'Advanced',
      estimatedStudyTime: 18 + index * 2,
      order: index + 1,
      prerequisites: index === 0 ? [] : [subject.lessons[index - 1][1]],
    })),
  )
