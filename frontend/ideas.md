# DevJams’26 Recreation — Design Ground Truth

This is a replication task. The live DevJams’26 page at https://devjams.dscvit.com/ is the ground-truth specification because no reference screenshot was provided.

## Reference observations

- Full-page event landing site with a deep navy / midnight blue canvas and playful Google Developer Groups visual language.
- Header begins with the GDG VIT mark, a hamburger/menu trigger with a small dinosaur graphic, and a full-screen or large overlay navigation containing Home, About, Tracks, Gallery, Sponsors, FAQs, Contact, and Idea Submission.
- Hero centers the custom “DevJams’26” wordmark assembled from individual illustrated letter assets. The hero also features oversized track illustrations for Android, Web, Gemini, and Cloud, with layered floating object art.
- Primary hero copy is “Wham Bam, Lets DevJam!” with an Idea Submission CTA.
- Sections include About DevJams, About GDG, About VIT, Tracks with six sponsored tracks, Previous Events, Our Sponsors, FAQ, and Contact/footer.
- Visual language is intentionally eclectic: dark blue backgrounds, bright cyan/electric blue accents, cream/light typography, chunky display lettering, illustrated 3D/mesh objects, and oversized decorative shapes.
- Interactions include a mobile/desktop menu, anchor navigation, track carousel controls and dots, FAQ tabs/accordion, sponsor links, social links, and a prominent CTA.

## Implementation commitment

Recreate the composition and interaction model with a maintainable React component system, CSS tokens, responsive breakpoints, and custom CSS illustrations where exact source media is unavailable. Avoid generic SaaS patterns: use a deep-space editorial canvas, irregular section geometry, hand-drawn/mesh-inspired ornaments, oversized display typography, and asymmetrical compositions that echo the reference.

## Style decisions

- **Design movement:** playful digital maximalism with GDG-inspired editorial web art direction.
- **Core principles:** dark atmospheric canvas; oversized illustrated typography; asymmetry with layered orbiting objects; interaction states that feel tactile and game-like.
- **Color philosophy:** midnight navy grounds the page so high-chroma Google-adjacent primaries can glow without gradients; off-white text keeps long-form copy legible; bright cyan, cobalt, coral, and citrus accents separate content families and preserve the reference’s festival energy.
- **Layout paradigm:** large viewport compositions first, with hero art drifting outside a central reading column; sections alternate between dense collage bands and calmer copy zones; mobile collapses into a single column while preserving overlap and object rhythm.
- **Signature elements:** custom outlined “DevJams’26” wordmark treatment; orbiting track cards with abstract mesh spheres; small mono utility labels and oversized bracketed headings.
- **Interaction philosophy:** controls should be obvious but feel like physical tabs, knobs, and cards; hover and focus states lift, brighten, or shift accents without changing the overall composition.
- **Animation:** use short ease-out entrances, slow ambient float on decorative objects, and snap carousel transitions under 300ms; respect reduced-motion preferences.
- **Typography system:** Space Grotesk for display and navigation; IBM Plex Mono for labels, counters, and metadata; generous tracking for utility text and tight line-height for hero headings.
- **Brand essence:** A mischievous, high-energy hackathon playground for builders who want to turn unusual ideas into working prototypes; personality: curious, kinetic, inventive.
- **Brand voice:** direct, playful, and lightly irreverent. Example lines: “Wham bam, let’s DevJam.” and “Got questions? Let’s break it down.”
- **Wordmark & logo:** use a custom CSS wordmark treatment with individually rotated, outlined, and filled glyphs plus a small orbit mark, rather than a default text lockup.
- **Signature brand color:** GDG electric cyan `#48d9ff` against `#08152f` midnight.
