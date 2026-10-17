# Deliverable 4 - Research Evidence and Literature Review

## Evidence method

The repository audit was combined with metadata checks against Crossref DOI records for the references below. Literature claims are limited to what those publications establish; they are not presented as evidence that FirstStep achieves the same outcomes.

## Related work

Adaptive educational systems traditionally represent a learner and adapt content or navigation to that representation. Brusilovsky's survey established adaptive hypermedia as a family of user-model-driven adaptation techniques [1]. FirstStep has learner-profile fields, recommendations, and multiple learning paths, but its source does not demonstrate a stable, validated user model across all modules.

Intelligent tutoring systems have been studied as alternatives or complements to human tutoring. VanLehn's review compared human tutoring, intelligent tutoring systems, and other systems and emphasized that effectiveness depends on the tutoring interaction, not merely the presence of automation [2]. FirstStep includes quizzes, task feedback, misconception paths, and generated explanations, but no controlled learning-gain study is available.

Roll and Wylie describe the evolution of AI in education from rule-based tutoring toward data-rich and adaptive systems [3]. FirstStep reflects this layered history: it combines conventional application logic, heuristics, supervised scikit-learn models, pretrained NLP/embedding models, and external generative APIs. This is an engineering integration contribution rather than a new learning algorithm.

Zawacki-Richter et al. systematically reviewed 146 studies from 2007-2018 and grouped AI in higher education into profiling/prediction, assessment/evaluation, adaptive systems/personalization, and intelligent tutoring [4]. FirstStep spans all four categories at the feature level, but its evidence is primarily implementation evidence; educational validity and ethical evaluation remain open.

Concept-map-based understanding analysis is relevant to Knowledge Forest. Jain et al. presented an AI-based concept-map approach for analyzing student understanding [5]. FirstStep stores graph nodes and edges and uses NetworkX, but the current Python graph generator is synthetic and does not establish equivalent concept-level diagnostic validity.

Steenbergen-Hu and Cooper's meta-analysis examined intelligent tutoring system effectiveness [6]. It supports evaluating tutoring systems with learning outcomes rather than assuming that usage or completion is learning. This is especially important for FirstStep's video telemetry: watch percentage, pauses, replays, and time spent are engagement indicators, not direct evidence of comprehension.

## Research gap and defensible contribution

A defensible gap is not that FirstStep is the first or state of the art. The narrower gap is an implementation-oriented integration problem: a single platform connects document-derived study materials, structured lessons, learner activity, video telemetry, assessments, administrative views, and multiple forms of AI assistance for a low-resource education context. The repository demonstrates a prototype of this integration, but not its educational impact.

Defensible contributions are:

1. A modular architecture that joins React interaction, Express business APIs, MongoDB learning artifacts, PostgreSQL identity data, and a Python AI service.
2. A document-to-study-material workflow combining extraction, NLP, embeddings, semantic indexing, and generated learning artifacts.
3. A persisted activity model that records lesson, quiz, revision, academy, programming, and administrative events.
4. A programming-learning video telemetry schema that stores playback segments and interaction counts rather than only a completion flag.
5. An explicit audit finding that distinguishes custom-trained models, pretrained models, LLM APIs, heuristics, and planned features.

These contributions describe system design and implementation. They do not prove improved retention, engagement, equity, or academic achievement.

## Literature-to-system comparison

| Research theme                           | Literature baseline                                | FirstStep relation                                            | Evidence status                                                  |
| ---------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Adaptive presentation and learner models | User-model-based adaptation [1]                    | Profile, recommendation, difficulty, and learning-path fields | Partially implemented; model consistency unresolved              |
| Intelligent tutoring                     | Tutoring interaction and feedback [2], [3], [6]    | Quiz, task, misconception, explanation, and challenge flows   | Implemented; learning gains untested                             |
| Learning analytics                       | Predictive and descriptive use of learner data [4] | Analytics, dashboard, activity, and video telemetry           | Implemented; metric validity and privacy need study              |
| Concept understanding                    | Concept-map-based AI analysis [5]                  | Forest nodes/edges/path/gaps and NetworkX                     | Partially implemented; synthetic graph generation                |
| Generative educational content           | Modern AI-in-education systems [3], [4]            | Gemini/Groq/local generation for notes and questions          | Implemented as a service integration; content quality unmeasured |

## Verified references in IEEE style

[1] P. Brusilovsky, "Adaptive Hypermedia," _User Modeling and User-Adapted Interaction_, vol. 11, no. 1-2, pp. 87-110, 2001, doi: [10.1023/A:1011143116306](https://doi.org/10.1023/A:1011143116306).

[2] K. VanLehn, "The Relative Effectiveness of Human Tutoring, Intelligent Tutoring Systems, and Other Tutoring Systems," _Educational Psychologist_, vol. 46, no. 4, pp. 197-221, 2011, doi: [10.1080/00461520.2011.611369](https://doi.org/10.1080/00461520.2011.611369).

[3] I. Roll and R. Wylie, "Evolution and Revolution in Artificial Intelligence in Education," _International Journal of Artificial Intelligence in Education_, vol. 26, no. 2, pp. 582-599, 2016, doi: [10.1007/s40593-016-0110-3](https://doi.org/10.1007/s40593-016-0110-3).

[4] O. Zawacki-Richter, V. I. Marín, M. Bond, and F. Gouverneur, "Systematic Review of Research on Artificial Intelligence Applications in Higher Education - Where Are the Educators?," _International Journal of Educational Technology in Higher Education_, vol. 16, no. 1, article 39, 2019, doi: [10.1186/s41239-019-0171-0](https://doi.org/10.1186/s41239-019-0171-0).

[5] G. P. Jain, V. P. Gurupur, J. L. Schroeder, and E. D. Faulkenberry, "Artificial Intelligence-Based Student Learning Evaluation: A Concept Map-Based Approach for Analyzing a Student's Understanding of a Topic," _IEEE Transactions on Learning Technologies_, vol. 7, no. 3, pp. 267-279, 2014, doi: [10.1109/TLT.2014.2330297](https://doi.org/10.1109/TLT.2014.2330297).

[6] S. Steenbergen-Hu and H. Cooper, "A Meta-Analysis of the Effectiveness of Intelligent Tutoring Systems on College Students' Academic Learning," _Journal of Educational Psychology_, vol. 106, no. 2, pp. 331-347, 2014, doi: [10.1037/a0034752](https://doi.org/10.1037/a0034752).

**Reference verification note:** The DOI metadata was checked against Crossref records during this audit. A commonly cited ACM DOI sometimes associated with learning analytics was not used because its Crossref record resolves to a different title; it is intentionally excluded rather than repeated without verification.
