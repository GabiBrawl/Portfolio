// Project data for Kibodo One
const projectData = {
    // Meta information
    meta: {
        title: "Kibodo One - Gabriel Yassin's Portfolio",
        description: "Possibly the coolest Keyboard built completely from scratch, with magnetically attachable modules, and a sick side-display.",
        ogImage: "https://gabibrawl.github.io/Portfolio/assets/images/kibodo.webp",
        url: "https://gabibrawl.github.io/Portfolio/projects/0.html"
    },

    // Header information
    header: {
        title: "Kibodo One",
        subtitle: "Custom Modular Keyboard with a side-display",
        logoStyle: "border: 2px solid var(--white); background-color: var(--black);"
    },

    // Gallery carousel images
    gallery: [
        {
            src: "assets/images/kibodo.webp",
            alt: "Keyboard Layout",
            caption: "Ergonomic split design with custom keycaps"
        },
        {
            src: "assets/images/kibodo.webp",
            alt: "Numpad Module",
            caption: "Magnetically attachable"
        },
        {
            src: "assets/images/kibodo.webp",
            alt: "Build Process",
            caption: "Handcrafted construction with precision engineering"
        },
        {
            src: "assets/images/kibodo.webp",
            alt: "Display",
            caption: "Side-mounted OLED display with custom graphics"
        }
    ],

    // Project content sections
    content: [
        {
            heading: "What is Kibodo One?",
            text: `Born from a highschool project, Kibodo One is a revolutionary mechanical keyboard built from the ground up with a focus on modularity, ergonomics, and aesthetic appeal. Unlike traditional keyboards, Kibodo One features magnetically attachable modules that allow users to customize their typing experience on the fly.

The crown jewel of the design is the integrated OLED side-display, which can show custom data, system information, and allows to configure everything on the keyboard without an app!`
        },
        {
            heading: "Design Philosophy",
            text: `Kibodo One represents my belief that peripherals should be extensions of the user, not constraints. Every decision—from switch selection to module design—prioritizes the user experience.

The modular design means you can swap components based on your current task: gaming, coding, writing, or just typing. The OLED display transforms a functional component into a creative canvas, allowing users to express themselves through custom animations and information displays.`
        },
        {
            heading: "The Modular Ecosystem",
            text: `The true innovation of Kibodo One lies in its modular system. Each module attaches magnetically to the side of the keyboard, creating a customizable peripheral ecosystem:

**SOON Macro Pad Module**: A small numpad-style module for frequently used macros

**Number Pad Module**: A full-sized number pad for spreadsheet work

**SOON Media Control Module**: Dedicated controls for volume, play/pause, and track switching

**SOON Game Mode Module**: Specialized buttons for gaming configurations

`
        },
        {
            heading: "Open Source Commitment",
            text: `Kibodo One is an open-source project, available on GitHub at https://github.com/PsychoDuckTech. This includes:

- Complete PCB schematics and layouts (KiCad format)
- 3D model files for the case (STEP format)
- 100% custom self-developed firmware source code

The community is encouraged to fork, modify, and improve upon the design. Contributing designers receive credit and can share their modules with the ecosystem.`
        }
    ],

    // Project links
    links: [
        {
            text: "View on GitHub",
            href: "https://github.com/PsychoDuckTech"
        }
    ],

    // Tags
    tags: [
        "Mechanical Keyboard",
        "Embedded Development",
        "Electronics",
        "OLED Display",
        "PCB Design",
        "QMK Firmware",
        "Open Source",
        "Hardware Design"
    ]
};
