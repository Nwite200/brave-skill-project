import 'package:flutter/material.dart';

import 'api.dart';
import 'biometric.dart';
import 'screens/lock.dart';
import 'screens/login.dart';
import 'screens/shell.dart';
import 'screens/splash.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await BiometricLock.instance.load();
  await Api.instance.load();
  runApp(const BraveSkillApp());
}

final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

class BraveSkillApp extends StatelessWidget {
  const BraveSkillApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Brave Skill Academy',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      navigatorKey: _navigatorKey,
      builder: (context, child) => AppLockGate(navigatorKey: _navigatorKey, child: child ?? const SizedBox.shrink()),
      home: SplashScreen(onFinished: (context) {
        if (Api.instance.isSignedIn) {
          Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const ShellScreen()));
        } else {
          Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
        }
      }),
    );
  }
}
