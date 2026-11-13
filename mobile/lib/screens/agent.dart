import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets.dart';

class AgentMessage {
  final String role;
  final String content;
  final String? ticket;
  AgentMessage({required this.role, required this.content, this.ticket});
}

class AgentScreen extends StatefulWidget {
  const AgentScreen({super.key});

  @override
  State<AgentScreen> createState() => _AgentScreenState();
}

class _AgentScreenState extends State<AgentScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _speech = SpeechToText();
  final _tts = FlutterTts();

  final List<AgentMessage> _messages = [];
  List<String> _suggestions = [];
  String? _conversationId;
  String _name = 'Brave AI Assistant';
  String _greeting = 'Hello, I am Brave AI, your learning assistant.';
  bool _loading = true;
  bool _sending = false;
  bool _listening = false;
  bool _speaking = false;
  bool _voiceOn = true;
  bool _speechReady = false;
  String _partial = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    _bootstrap();
    _initTts();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    _speech.stop();
    _tts.stop();
    super.dispose();
  }

  Future<void> _initTts() async {
    try {
      await _tts.setSpeechRate(0.46);
      await _tts.setPitch(1.0);
      await _tts.awaitSpeakCompletion(true);
      try {
        await _tts.setLanguage('en-NG');
      } catch (_) {
        await _tts.setLanguage('en-GB');
      }
      _tts.setCompletionHandler(() {
        if (mounted) setState(() => _speaking = false);
      });
      _tts.setCancelHandler(() {
        if (mounted) setState(() => _speaking = false);
      });
    } catch (_) {
      // TTS is optional; text remains fully functional.
    }
  }

  Future<void> _bootstrap() async {
    try {
      final data = await Api.instance.agentBootstrap();
      if (!mounted) return;
      setState(() {
        _name = (data['name'] ?? _name) as String;
        _greeting = (data['greeting'] ?? _greeting) as String;
        _suggestions = ((data['suggestions'] ?? []) as List).map((e) => e.toString()).toList();
        _loading = false;
      });
      _messages.add(AgentMessage(role: 'assistant', content: _greeting));
      _scrollDown();
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = error.message;
        });
      }
    }
  }

  void _scrollDown() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(_scroll.position.maxScrollExtent + 120, duration: const Duration(milliseconds: 350), curve: Curves.easeOut);
    });
  }

  Future<void> _send(String value) async {
    final message = value.trim();
    if (message.isEmpty || _sending) return;
    _input.clear();
    setState(() {
      _sending = true;
      _error = null;
      _partial = '';
      _messages.add(AgentMessage(role: 'user', content: message));
      _suggestions = [];
    });
    _scrollDown();
    await _tts.stop();
    if (mounted) setState(() => _speaking = false);

    try {
      final data = await Api.instance.agentChat(message: message, conversationId: _conversationId);
      if (!mounted) return;
      setState(() {
        _conversationId = data['conversationId'] as String?;
        _messages.add(AgentMessage(
          role: 'assistant',
          content: (data['reply'] ?? '') as String,
          ticket: data['ticketReference'] as String?,
        ));
        _suggestions = ((data['suggestions'] ?? []) as List).map((e) => e.toString()).toList();
      });
      _scrollDown();
      final reply = (data['reply'] ?? '') as String;
      if (_voiceOn && reply.isNotEmpty) {
        setState(() => _speaking = true);
        try {
          await _tts.speak(reply);
        } catch (_) {
          if (mounted) setState(() => _speaking = false);
        }
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _toggleListening() async {
    if (_listening) {
      await _speech.stop();
      if (mounted) setState(() => _listening = false);
      return;
    }
    await _tts.stop();
    if (mounted) setState(() => _speaking = false);
    if (!_speechReady) {
      _speechReady = await _speech.initialize(
        onStatus: (status) {
          if (!mounted) return;
          if (status == 'done' || status == 'notListening') setState(() => _listening = false);
        },
        onError: (error) {
          if (!mounted) return;
          setState(() {
            _listening = false;
            _error = 'I could not hear that clearly. You can type your question instead.';
          });
        },
      );
    }
    if (!_speechReady) {
      setState(() => _error = 'Microphone permission is needed for voice. You can still type below.');
      return;
    }
    setState(() {
      _listening = true;
      _error = null;
      _partial = '';
    });
    await _speech.listen(
      localeId: 'en_NG',
      listenFor: const Duration(seconds: 40),
      pauseFor: const Duration(seconds: 3),
      onResult: (result) {
        if (!mounted) return;
        setState(() => _partial = result.recognizedWords);
        if (result.finalResult && result.recognizedWords.trim().isNotEmpty) {
          setState(() => _listening = false);
          _send(result.recognizedWords);
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BsColors.ink,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(gradient: brandGradient, shape: BoxShape.circle),
              child: const Icon(Icons.smart_toy_outlined, size: 17, color: Colors.white),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  Text(
                    _listening ? 'Listening…' : _speaking ? 'Speaking…' : 'Online · voice and text',
                    style: TextStyle(fontSize: 8.5, color: _listening ? BsColors.cyan : BsColors.muted),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: _voiceOn ? 'Mute voice' : 'Unmute voice',
            onPressed: () async {
              if (_voiceOn) await _tts.stop();
              setState(() {
                _voiceOn = !_voiceOn;
                _speaking = false;
              });
            },
            icon: Icon(_voiceOn ? Icons.volume_up_outlined : Icons.volume_off_outlined, size: 20),
          ),
          IconButton(
            tooltip: 'New conversation',
            onPressed: () {
              setState(() {
                _messages
                  ..clear()
                  ..add(AgentMessage(role: 'assistant', content: _greeting));
                _conversationId = null;
                _error = null;
              });
              _bootstrap();
            },
            icon: const Icon(Icons.refresh, size: 19),
          ),
        ],
      ),
      body: ScreenBackground(
        child: _loading
            ? const LoadingView()
            : Column(
                children: [
                  Expanded(
                    child: ListView(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                      children: [
                        ..._messages.map(_bubble),
                        if (_partial.isNotEmpty)
                          Align(
                            alignment: Alignment.centerRight,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8, left: 60),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: BsColors.cyan.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: BsColors.cyan.withValues(alpha: 0.25)),
                              ),
                              child: Text(_partial, style: const TextStyle(fontSize: 12, color: Color(0xFF9BEFF6), fontStyle: FontStyle.italic)),
                            ),
                          ),
                        if (_sending)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 10),
                            child: Row(
                              children: [
                                SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5, color: BsColors.cyan)),
                                SizedBox(width: 8),
                                Text('Checking the academy…', style: TextStyle(fontSize: 10, color: BsColors.muted)),
                              ],
                            ),
                          ),
                        if (_listening)
                          Container(
                            margin: const EdgeInsets.symmetric(vertical: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: BsColors.cyan.withValues(alpha: 0.06),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: BsColors.cyan.withValues(alpha: 0.2)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.graphic_eq, size: 15, color: BsColors.cyan),
                                const SizedBox(width: 8),
                                Expanded(child: Text(_partial.isEmpty ? 'Listening — speak naturally, then pause.' : _partial, style: const TextStyle(fontSize: 10.5, color: BsColors.cyan))),
                              ],
                            ),
                          ),
                        if (_error != null)
                          Container(
                            margin: const EdgeInsets.only(top: 6),
                            padding: const EdgeInsets.all(11),
                            decoration: BoxDecoration(color: BsColors.danger.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                            child: Text(_error!, style: const TextStyle(fontSize: 10.5, color: Color(0xFFFFC9D2))),
                          ),
                        if (_suggestions.isNotEmpty && _messages.length <= 2 && !_sending)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              children: _suggestions.take(4).map((suggestion) {
                                return GestureDetector(
                                  onTap: () => _send(suggestion),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.03),
                                      borderRadius: BorderRadius.circular(999),
                                      border: Border.all(color: BsColors.line),
                                    ),
                                    child: Text(suggestion, style: const TextStyle(fontSize: 9.5, color: BsColors.muted)),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        const SizedBox(height: 6),
                        const Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text(
                            'AI can make mistakes. Payments and certificates are verified in your dashboard. Never share passwords or OTPs.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 8, height: 1.5, color: BsColors.dim),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SafeArea(
                    top: false,
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                      decoration: const BoxDecoration(
                        color: Color(0xFF07080F),
                        border: Border(top: BorderSide(color: BsColors.line)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          GestureDetector(
                            onTap: _toggleListening,
                            child: Container(
                              width: 46,
                              height: 46,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _listening ? BsColors.cyan.withValues(alpha: 0.15) : Colors.white.withValues(alpha: 0.04),
                                border: Border.all(color: _listening ? BsColors.cyan.withValues(alpha: 0.5) : BsColors.line),
                              ),
                              child: Icon(_listening ? Icons.mic_off : Icons.mic, size: 20, color: _listening ? BsColors.cyan : BsColors.muted),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _input,
                              minLines: 1,
                              maxLines: 4,
                              maxLength: 2000,
                              style: const TextStyle(fontSize: 12),
                              textInputAction: TextInputAction.send,
                              onSubmitted: _send,
                              decoration: const InputDecoration(
                                hintText: 'Ask about courses, payments or progress…',
                                counterText: '',
                                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => _send(_input.text),
                            child: Container(
                              width: 46,
                              height: 46,
                              decoration: const BoxDecoration(gradient: brandGradient, shape: BoxShape.circle),
                              child: _sending
                                  ? const Padding(padding: EdgeInsets.all(14), child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.arrow_upward_rounded, size: 20, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _bubble(AgentMessage message) {
    final isUser = message.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(bottom: 8, left: isUser ? 54 : 0, right: isUser ? 0 : 40),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: isUser ? brandGradient : null,
          color: isUser ? null : Colors.white.withValues(alpha: 0.035),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(15),
            topRight: const Radius.circular(15),
            bottomLeft: Radius.circular(isUser ? 15 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 15),
          ),
          border: isUser ? null : Border.all(color: BsColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.content,
              style: TextStyle(fontSize: 12, height: 1.6, color: isUser ? Colors.white : const Color(0xFFD6DFEC)),
            ),
            if (message.ticket != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: BsColors.emerald.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: BsColors.emerald.withValues(alpha: 0.25)),
                ),
                child: Text('Ticket ${message.ticket} · the team will reply by email', style: const TextStyle(fontSize: 8.5, color: BsColors.emerald)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
