# SIEM NLP Dashboard

## Overview

This project is a SIEM (Security Information and Event Management) dashboard that enables natural language querying of security logs. The application combines a React frontend with an Express.js backend to provide an intuitive chat interface for security analysts to investigate events, generate reports, and visualize security data through natural language queries instead of complex query languages.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using **React with TypeScript** and leverages several modern technologies:
- **UI Framework**: Radix UI components with shadcn/ui for consistent, accessible interface elements
- **Styling**: Tailwind CSS for utility-first styling with custom CSS variables for theming
- **State Management**: TanStack React Query for server state management and caching
- **Charts**: Chart.js for security data visualizations (timelines, source IP distributions)
- **Routing**: Wouter for lightweight client-side routing

The application features a split-panel interface with a chat sidebar for natural language queries and a main content area displaying query results, generated Elasticsearch DSL, and interactive charts.

### Backend Architecture
The server is built with **Express.js** and TypeScript, following a modular architecture:
- **Route Handling**: Centralized route registration with session-based conversation management
- **Storage Layer**: Abstract storage interface with in-memory implementation for development (easily extensible to database)
- **Session Management**: Express sessions for maintaining conversation context across interactions
- **NLP Processing**: Custom natural language parser that translates user queries into structured filters

### Data Storage Solutions
The application uses a **hybrid storage approach**:
- **Database Schema**: Drizzle ORM with PostgreSQL schema definitions for production data persistence
- **Development Storage**: In-memory storage implementation that loads mock SIEM data from JSON files
- **Session Storage**: Express sessions with configurable storage backend
- **Mock Data**: JSON-based security event data for development and demonstration

### Authentication and Authorization
Currently implements **session-based authentication** using Express sessions:
- Session cookies for user identification
- Conversation history tied to session IDs
- Configurable session timeout and security settings
- Ready for extension to more robust authentication systems

### Query Processing Pipeline
The system implements a sophisticated **natural language to query translation pipeline**:
1. **NLP Parser**: Extracts intent, entities (time ranges, event types, IP addresses), and filters from natural language
2. **Query Generator**: Converts parsed entities into Elasticsearch DSL queries and internal filter objects
3. **Execution Engine**: Processes queries against mock data (easily replaceable with Elasticsearch client)
4. **Response Formatter**: Generates narrative summaries, data tables, and chart configurations from results

### Chart and Visualization System
**Chart.js integration** with custom data processing:
- Dynamic chart generation from query results
- Multiple chart types: timeline charts, source IP distributions, risk level breakdowns
- Responsive design with proper cleanup of chart instances
- Chart data optimized for security analysis patterns

## External Dependencies

### Core Frameworks and Libraries
- **@neondatabase/serverless**: PostgreSQL client for Neon database integration
- **drizzle-orm**: Type-safe database ORM with PostgreSQL support
- **express**: Web application framework with session management
- **@tanstack/react-query**: Server state management and caching
- **chart.js**: Chart rendering and data visualization

### UI and Design System
- **@radix-ui/***: Comprehensive collection of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variant handling
- **lucide-react**: Icon library for consistent iconography

### Development and Build Tools
- **vite**: Fast build tool and development server
- **typescript**: Type safety across frontend and backend
- **drizzle-kit**: Database migrations and schema management
- **esbuild**: Fast JavaScript bundler for production builds

### Third-Party Services Integration
- **Neon Database**: Serverless PostgreSQL database hosting
- **Elasticsearch**: Ready for integration as the primary SIEM data source (currently using mock data)
- **Replit**: Development environment with specialized plugins for runtime error handling and development tools

The architecture is designed to easily scale from the current mock data implementation to a production system connected to real Elasticsearch clusters or other SIEM data sources.