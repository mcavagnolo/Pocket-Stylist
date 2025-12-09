# Pocket Stylist - Tool Design

## Summary
This is a mobile app-based tool that users can use to decide what outfits to wear (of the clothes in their closet).

## Specifics

### 1. Clothing Capture
- A user would use their camera to take and upload pictures of the clothes that they own.

### 2. Virtual Dressing Room
- These articles will be available for viewing by the user in their "virtual dressing room".
- "Recently worn" items will still be visible but grayed out and unavailable for selection based on the refresh cycle.
- Users can create their own custom outfits here.

### 3. User Profile
- The user will upload a picture of themselves for the virtual try-on feature.

### 4. AI Indexing
- An AI will code the clothes upon upload to gather their characteristics.
- Builds a detailed index of owned articles (with their pictures) stored in the virtual dressing room.

### 5. Outfit Request
A user will submit a request for an outfit with category options:
- **Destination**: work, around the house, kids' soccer game, night out, fancy, etc.
- **Temperature**: at destination.
- **Style**: (placeholder).
- **Other**: Extensible categorization.

### 6. AI Outfit Generation
The tool will rely on an AI to choose three different outfits meeting the criteria. Output includes:
- **Summary**: Short summary of the outfit and why it was chosen (tied to criteria).
- **Item Breakdown**: One line description and picture of each article.
- **Virtual Try-On**: A picture of the user wearing the outfit.

### 7. Outfit Schedule
- Users can mark outfits to wear for different days/nights of the week to create an outfit schedule.

### 8. Refresh Cycle
- User can select a "refresh cycle" for each article.
- After an article is used, it is removed from the virtual dressing room for the set number of days.
