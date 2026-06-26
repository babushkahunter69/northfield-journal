# Homepage spacing fix

This patch removes the large blank vertical space before the homepage article grid.

Changes:
- Removed the empty AdSense placeholder above Latest Articles.
- Reduced top hero spacing.
- Reduced hero vertical padding.
- Reduced feature panel section spacing.
- Reduced Latest Articles top padding.

Reason:
The empty ad slot and stacked section padding created a large blank area before the visible article feed, especially when the ad slot did not render an ad.
