# Cadence Frontend Architecture

## App architecture
- Keep the weather dashboard at the index route and its visual system in the global stylesheet so the reference composition has one consistent source of styling.
- Treat displayed weather as reference sample data rather than live observations until a weather service is connected.
- Use the shared WeatherSelect control for dashboard dropdowns so native browser menus cannot bypass the theme.
- Keep weather condition images in the typed weatherArtwork registry so future condition changes reuse stored artwork instead of generating images at runtime.
- Keep activity inputs, result presentation, timeline, and trust context in focused planner components, with a pure mock comparison helper separate from rendering for later backend replacement and rule tests.
- Compare complete blocks at quarter-hour starts using maximum values across every overlapping valid hour; exclude missing and suspect hours and keep alternatives opt-in so incomplete coverage never becomes a successful recommendation.
