# Plant Acceptance Tests

These are practical tests the system must pass before it should be trusted for a real freezer inventory pilot.

## 1. Production split
Enter Julian 238, Vanilla, 3 gal, total 54, Storefront 4.
Expected: 50 in -40°F lab hold; 4 in Storefront; 0 added to saleable.

## 2. Lab pass
Pass the 50 good units from test 1.
Expected: -40°F decreases by 50 and -20°F saleable increases by 50 in one transaction.

## 3. Lab fail
Create a pending lot and fail it.
Expected: no saleable stock is created; hold is removed; disposal is recorded; Storefront remains separate.

## 4. Customer reservation
Reserve 6 Vanilla 3 gal.
Expected: on-hand does not change; reserved +6; available -6.

## 5. Customer completion
Complete/pull the reservation.
Expected: on-hand -6; reserved -6; available remains consistent; order cannot be completed twice.

## 6. Customer cancellation
Reserve product then cancel before pulling.
Expected: reservation returns to available; physical on-hand never changes.

## 7. Multi-flavor order
Reserve several flavors in one order.
Expected: all lines reserve together. If one line is short, none of the lines post.

## 8. Dairy Bar cart
Withdraw multiple flavors for Dairy Bar.
Expected: all selected quantities deduct immediately because product is physically leaving inventory.

## 9. Storefront isolation
Attempt to fulfill an order using Storefront inventory.
Expected: blocked.

## 10. Lab-hold isolation
Attempt to fulfill an order using -40°F pending product.
Expected: blocked.

## 11. Hard-count correction
System says 31; physical count is 29.
Expected: adjustment -2 is recorded; visible inventory becomes 29; original history remains intact.

## 12. Void mistaken production
Void a production entry.
Expected: its remaining inventory effect is reversed safely and the original record remains visible in audit history.

## 13. FIFO recommendation
Have Julian 231 and Julian 238 of the same flavor/package available.
Expected: pick plan recommends Julian 231 first, then 238 if more quantity is required.

## 14. Freezer location
Place the same flavor on two different shelves.
Expected: both locations appear in Find Ice Cream and totals remain correct.

## 15. Low-stock warning
Reduce available inventory through the configured threshold.
Expected: warning changes from OK to LOW/CRITICAL/OUT based on available inventory, not gross on-hand.

## 16. Incoming hold context
Make saleable inventory low while the same product exists in -40°F hold.
Expected: warning still reports low saleable stock but clearly shows incoming/pending lab-hold quantity.

## 17. No negative inventory
Try to withdraw more than available.
Expected: operation is blocked with a clear quantity message and no partial inventory changes.

## 18. Refresh/persistence
After database integration, perform a transaction and refresh/reopen the app.
Expected: quantities, order status, lot status, and audit history remain unchanged.
