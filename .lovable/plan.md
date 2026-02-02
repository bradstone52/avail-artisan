
# Batch City Data Sync - Handle Unmatched Properties

## Status: ✅ IMPLEMENTED

## Problem Statement
When running "Fetch All City Data", properties that don't find a match in the City of Calgary database are processed silently with no indication of failure. Users aren't informed which properties need manual address correction using the City Parcel Picker.

## Solution Implemented
Track unmatched properties during batch sync and surface them to users so they can take corrective action.

## Changes Made

### 1. `fetch-city-data` Edge Function ✅
- Response now includes `matchStatus: 'found' | 'not_found'`
- Response includes `propertyId` and `address` for tracking

### 2. `nightly-property-sync` Edge Function ✅
- Tracks `matched` and `unmatched` counts during batch processing
- Stores `unmatchedAddresses` (last 50) in progress object
- Final completion status includes full match summary

### 3. Properties Page UI ✅
- Progress polling now reads `matched`/`unmatched` fields
- Completion toast shows: "45 of 50 properties matched. 5 need manual review."
- Added **"Needs Review"** filter button to show unmatched Calgary properties

### 4. Unmatched Properties Filter ✅
- "Needs Review" button filters to Calgary properties where:
  - `city_data_fetched_at` is set (sync was attempted)
  - `roll_number` is NULL (no city match found)
- Users can click through to individual properties and use City Parcel Picker
