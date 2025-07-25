# TaskFlow: Structured Project Workflow System

TaskFlow is a comprehensive workflow management system for software projects that combines task-based management with state-driven workflows in a file-based approach.

## Overview

TaskFlow provides a structured approach to project planning, task tracking, and development processes by:

- Organizing projects using a consistent directory structure
- Tracking project state and progress through markdown files
- Breaking down requirements into manageable tasks
- Integrating with AI assistants for enhanced productivity

## Key Features

- **File-Based Workflow**: All project state stored in markdown files for easy version control
- **Phase-Based Development**: Clearly defined workflow phases (Planning, Development, Testing, Deployment)
- **Task Management**: Structured task creation, tracking, and dependency management
- **AI Integration**: Designed to work with Claude Desktop and Cursor AI
- **Blueprint Approach**: Transform TaskFlow into a specific project using a project blueprint

## Directory Structure

```
project-name/
├── README.md                    # Project overview
├── .cursor/                     # Cursor IDE integration
│   ├── rules/                   # Rules for Cursor AI
│   │   └── task_workflow.mdc    # AI assistant rules
│   └── setup/                   # Cursor setup files
│       └── setup.md             # Setup instructions for Cursor
├── .tf/                         # TaskFlow infrastructure
│   ├── docs/                    # Project documentation
│   │   ├── prd.md               # Product Requirements Document
│   │   └── project_config.md    # Project configuration
│   ├── init/                    # Project initialization files
│   │   ├── blueprint.md         # Blueprint template
│   │   ├── process.md           # Processing instructions
│   │   ├── examples/            # Example projects
│   │   └── README.md            # Initialization documentation
│   └── workflow/                # Workflow management
│       ├── workflow_state.md    # Current project state
│       └── templates/           # File templates
│           ├── task_template.md # Task template
│           └── ...              # Additional templates
└── tasks/                       # Individual task files
    ├── task_001.md              # Task example
    └── ...                      # Additional tasks
```

## Getting Started

The recommended way to use TaskFlow is with the Blueprint approach:

1. **Download TaskFlow**: Download and rename the TaskFlow folder to your project name
2. **Create Blueprint**: Create a project blueprint using the template in `.tf/init/blueprint.md`
3. **Process with Claude**: Have Claude Desktop process your blueprint using the guide in `.tf/init/process.md`
4. **Complete Setup**: Open in Cursor and run the setup command

For detailed instructions, see the [Initialization Guide](.tf/init/README.md).

## Core Components

- **Product Requirements Document** (`.tf/docs/prd.md`): Project requirements and specifications
- **Project Configuration** (`.tf/docs/project_config.md`): Technical details and team information
- **Workflow State** (`.tf/workflow/workflow_state.md`): Current phase, active tasks, and progress
- **Task Files** (`tasks/task_XXX.md`): Individual task details, steps, and acceptance criteria
- **Blueprint** (`.tf/init/blueprint.md`): Template for defining project parameters

## Workflow Process

TaskFlow projects progress through four phases:

1. **Planning Phase**: Create PRD, project configuration, and initial tasks
2. **Development Phase**: Implement tasks in priority order, tracking progress
3. **Testing Phase**: Verify implementations against acceptance criteria
4. **Deployment Phase**: Release and monitor the implementation

## Claude Desktop and Cursor Integration

TaskFlow is designed to work seamlessly with AI assistants:

- **Claude Desktop**: Used for initial project preparation and blueprint processing
- **Cursor**: Used for development assistance and project setup completion

This integration creates a powerful workflow where Claude handles planning and research while Cursor assists with implementation.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
