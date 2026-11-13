import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final activity = await Api.instance.activity();
      if (mounted) {
        setState(() => _items = (activity['notifications'] as List).cast<Map<String, dynamic>>());
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAll() async {
    await Api.instance.markNotificationsRead();
    if (!mounted) return;
    setState(() {
      _items = _items.map((item) => {...item, 'readAt': DateTime.now().toIso8601String()}).toList();
    });
    showSnack(context, 'All notifications marked as read.');
  }

  @override
  Widget build(BuildContext context) {
    final unread = _items.where((item) => item['readAt'] == null).length;
    return Scaffold(
      backgroundColor: BsColors.ink,
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: _markAll,
              child: const Text('Mark all read', style: TextStyle(fontSize: 10.5)),
            ),
        ],
      ),
      body: ScreenBackground(
        child: _loading
            ? const LoadingView()
            : _error != null
                ? ErrorView(message: _error!, onRetry: _load)
                : RefreshIndicator(
                    color: BsColors.cyan,
                    backgroundColor: BsColors.panel,
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
                      children: [
                        if (_items.isEmpty)
                          const EmptyView(icon: Icons.notifications_none, title: 'No notifications', body: 'Your updates will appear here.')
                        else
                          ..._items.map((item) {
                            final read = item['readAt'] != null;
                            final type = (item['type'] ?? 'SYSTEM') as String;
                            final icon = switch (type) {
                              'PAYMENT' => Icons.credit_card,
                              'CERTIFICATE' => Icons.workspace_premium_outlined,
                              'ANNOUNCEMENT' => Icons.campaign_outlined,
                              'COURSE' => Icons.play_circle_outline,
                              _ => Icons.notifications_none,
                            };
                            return BsCard(
                              padding: const EdgeInsets.all(13),
                              color: read ? BsColors.panel : BsColors.purple.withValues(alpha: 0.09),
                              border: Border.all(color: read ? BsColors.line : BsColors.purple.withValues(alpha: 0.25)),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: (read ? BsColors.muted : BsColors.purple).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(9),
                                    ),
                                    child: Icon(icon, size: 15, color: read ? BsColors.dim : const Color(0xFFC9B8FF)),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                (item['title'] ?? '') as String,
                                                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.white),
                                              ),
                                            ),
                                            if (!read)
                                              Container(width: 5, height: 5, decoration: const BoxDecoration(color: BsColors.cyan, shape: BoxShape.circle)),
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          (item['body'] ?? '') as String,
                                          style: const TextStyle(fontSize: 10.5, height: 1.55, color: BsColors.muted),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          timeAgo(DateTime.tryParse(item['createdAt']?.toString() ?? '') ?? DateTime.now()),
                                          style: const TextStyle(fontSize: 9, color: BsColors.dim),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
      ),
    );
  }
}
