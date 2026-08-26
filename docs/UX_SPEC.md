# Operator UX Specification

## Goal

A busy employee should be able to perform the common actions with almost no training. The UI must use plant language, large controls, obvious confirmations, and no inventory arithmetic.

## Home screen quick actions

Five large actions:

1. `Customer Order`
2. `Dairy Bar`
3. `Add Production`
4. `Find Ice Cream`
5. `Hard Count / Fix Number`

Warnings appear underneath, not ahead of the primary work.

## Multi-product cart

Customer orders and Dairy Bar withdrawals use the same fast cart interaction.

Example:

- Vanilla · 3 gal · 4
- Chocolate · 3 gal · 3
- Strawberry · 48 oz · 12

The employee can tap `+` or `−`, type a quantity, remove a line, or add another flavor. The app checks all quantities against available saleable inventory before confirmation.

For customer orders, confirmation reserves the entire cart atomically. Pull/completion later deducts the entire cart atomically.

For Dairy Bar, confirmation means the product is being physically pulled now, so all cart lines deduct immediately.

If any line cannot be fulfilled, nothing in the cart should partially post. Show the shortage clearly and leave the cart intact.

## Hard count / Fix Number

The employee chooses:

`Freezer → Flavor → Package → Julian (optional)`

The screen shows a very large system count and a large physical-count input.

Example:

`SYSTEM: 31`

`I COUNTED: [ 29 ]`

`Difference: -2`

Primary button: `Fix inventory to 29`

This creates an adjustment; it never rewrites history.

## Find Ice Cream

Search should accept flavor first because that is how an employee thinks while pulling product.

Example result:

`Vanilla · 3 gal`

`Pull first: Julian 231 — Back Wall / Bottom / Position 2 — 8 tubs`

`Then: Julian 238 — Right Wall / Bottom / Position 1 — 14 tubs`

The oldest eligible released lot is shown first.

## Freezer map

The room view contains all four walls:

- Back
- Left
- Right
- Entrance

The entrance wall includes shelving interrupted by the door.

Clicking a wall opens three shelf levels: Top, Middle, Bottom. A shelf is not assigned permanently to one flavor. Multiple flavor/Julian stacks may share it.

Each visible stack displays:

`Flavor color`
`Flavor`
`Julian`
`Quantity`

Tapping a stack opens `Move`, `Adjust`, and `Details`.

## Confirmation philosophy

Do not ask "Are you sure?" for ordinary reversible navigation.

Require confirmation for inventory-affecting actions:

- complete customer pickup
- Dairy Bar withdrawal
- lab FAIL/disposal
- waste
- void/delete
- hard-count correction

The confirmation must say what will happen, e.g. `Remove 17 units from -20°F inventory?`

## Error prevention

- No negative inventory.
- Storefront cannot fulfill orders.
- Lab-hold product cannot fulfill orders.
- Failed lots cannot move to saleable.
- A completed order cannot be completed twice.
- A cancelled reservation cannot later be completed.
- Multi-line actions are all-or-nothing.
- Quantity inputs are whole numbers only.
