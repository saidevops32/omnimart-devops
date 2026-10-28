import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

void main() => runApp(const OmniMartApp());

class OmniMartApp extends StatelessWidget {
  const OmniMartApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OmniMart Quick-Commerce',
      theme: ThemeData(primarySwatch: Colors.green, useMaterial3: true),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List products = [];
  String trackingMessage = 'No active order';
  WebSocketChannel? channel;

  @override
  void initState() {
    super.initState();
    fetchCatalog();
  }

  Future<void> fetchCatalog() async {
    try {
      // Connects to the AKS Ingress Path Rule for Catalog
      final res = await http.get(Uri.parse('https://<YOUR_INGRESS_IP>/api/catalog/items'));
      if (res.statusCode == 200) {
        setState(() => products = jsonDecode(res.body));
      }
    } catch (_) {
      setState(() {
        products = [
          {'id': 'PROD-001', 'name': 'Fresh Bananas', 'price': 48},
          {'id': 'PROD-002', 'name': 'Full Cream Milk', 'price': 33},
        ];
      });
    }
  }

  void placeOrder() async {
    // Triggers Java Spring Boot Checkout Service
    channel = WebSocketChannel.connect(Uri.parse('wss://<YOUR_INGRESS_IP>/ws/tracking/stream'));
    channel?.stream.listen((data) {
      setState(() => trackingMessage = 'Rider Telemetry: $data');
    });
  }

  @override
  void dispose() {
    channel?.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('OmniMart Mobile Express')),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.amber.shade100,
            width: double.infinity,
            child: Text(trackingMessage, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: products.length,
              itemBuilder: (context, index) {
                final item = products[index];
                return ListTile(
                  title: Text(item['name'] ?? ''),
                  subtitle: Text('₹${item['price']}'),
                  trailing: ElevatedButton(onPressed: placeOrder, child: const Text('BUY')),
                );
              },
            ),
          )
        ],
      ),
    );
  }
}
