# NEXUS moderation enforcement and appeals
- Moderators can restrict reported posts (post status blocked, moderation_state rejected, media asset upload_state blocked) or hide reported comments. Profile reports are triaged but not auto-actioned; account restrictions need a separate policy/process.
- Creators can appeal only their own blocked/removed posts or hidden comments. One open appeal per creator/content item is checked by the server.
- Appeal decisions are moderator-only. Reversed post appeals restore post visibility and asset state; reversed comment appeals restore visible status. Upheld appeals leave restrictions in place.
- Every enforcement and appeal decision writes an audit event. Reports/appeals/audit data are server-only for staff; creators can read and submit only their own appeals.
- Apply 202611050009_moderation_appeals.sql after the moderator roles migration. Server environment variables remain server-only. Test rollback/retry and provider playback before public launch.
