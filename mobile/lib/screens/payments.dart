import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets.dart';

class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  List<OrderInfo> _orders = [];
  bool _loading = true;
  String? _error;
  String? _downloading;

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
        setState(() => _orders = (activity['orders'] as List).map((e) => OrderInfo.fromJson(e as Map<String, dynamic>)).toList());
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _receipt(OrderInfo order) async {
    setState(() => _downloading = order.id);
    try {
      final file = await Api.instance.download('/payments/receipt/${order.id}', 'Brave-Skill-Receipt-${order.reference}.pdf');
      await OpenFilex.open(file.path);
    } on ApiException catch (error) {
      if (mounted) showSnack(context, error.message, error: true);
    } finally {
      if (mounted) setState(() => _downloading = null);
    }
  }

  Color _tone(String status) => switch (status) {
        'PAID' => BsColors.emerald,
        'PENDING' => BsColors.warning,
        'REFUNDED' => BsColors.muted,
        _ => BsColors.danger,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BsColors.ink,
      appBar: AppBar(title: const Text('Payment history')),
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
                        if (_orders.isEmpty)
                          const EmptyView(icon: Icons.receipt_long_outlined, title: 'No payments yet', body: 'Course purchases and receipts will appear here.')
                        else
                          ..._orders.map((order) => BsCard(
                                padding: const EdgeInsets.all(13),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(order.courseTitle, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                                        ),
                                        Pill(label: order.status, color: _tone(order.status)),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(naira(order.amountKobo), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
                                    const SizedBox(height: 4),
                                    Text('${order.reference} · ${shortDate(order.paidAt ?? order.createdAt)}', style: const TextStyle(fontSize: 9.5, color: BsColors.dim)),
                                    if (order.status == 'PAID') ...[
                                      const SizedBox(height: 10),
                                      Align(
                                        alignment: Alignment.centerRight,
                                        child: TextButton.icon(
                                          onPressed: _downloading == order.id ? null : () => _receipt(order),
                                          icon: _downloading == order.id
                                              ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                                              : const Icon(Icons.download_rounded, size: 14),
                                          label: const Text('Receipt', style: TextStyle(fontSize: 10.5)),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              )),
                      ],
                    ),
                  ),
      ),
    );
  }
}
