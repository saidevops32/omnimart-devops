package com.omnimart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

@SpringBootApplication
@RestController
@CrossOrigin(origins = "*")
public class CheckoutApplication {

    public static void main(String[] args) {
        SpringApplication.run(CheckoutApplication.class, args);
    }

    @GetMapping("/api/checkout/healthz")
    public Map<String, String> health() {
        return Map.of("status", "healthy", "service", "checkout-java-mssql", "timestamp", Instant.now().toString());
    }

    private final Map<String, List<CartItem>> activeCarts = new HashMap<>();

    public record CartItem(String productId, String name, BigDecimal price, int quantity) {}
    public record AddToCartRequest(String userId, String productId, String name, BigDecimal price, int quantity) {}
    public record CheckoutRequest(String userId, String deliveryAddress, String paymentMethod) {}

    @PostMapping("/api/cart/add")
    public ResponseEntity<Map<String, Object>> addToCart(@RequestBody AddToCartRequest req) {
        List<CartItem> items = activeCarts.computeIfAbsent(req.userId(), k -> new ArrayList<>());

        boolean updated = false;
        for (int i = 0; i < items.size(); i++) {
            CartItem c = items.get(i);
            if (c.productId().equals(req.productId())) {
                items.set(i, new CartItem(c.productId(), c.name(), c.price(), c.quantity() + req.quantity()));
                updated = true;
                break;
            }
        }
        if (!updated) {
            items.add(new CartItem(req.productId(), req.name(), req.price(), req.quantity()));
        }

        return ResponseEntity.ok(buildSummary(req.userId(), items));
    }

    @GetMapping("/api/cart/{userId}")
    public ResponseEntity<Map<String, Object>> getCart(@PathVariable String userId) {
        List<CartItem> items = activeCarts.getOrDefault(userId, Collections.emptyList());
        return ResponseEntity.ok(buildSummary(userId, items));
    }

    @PostMapping("/api/checkout/process")
    public ResponseEntity<Map<String, Object>> processOrder(@RequestBody CheckoutRequest req) {
        List<CartItem> items = activeCarts.get(req.userId());
        if (items == null || items.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cart is empty. Add grocery items before checkout."));
        }

        Map<String, Object> summary = buildSummary(req.userId(), items);
        String orderId = "OMNI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        activeCarts.remove(req.userId());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("orderId", orderId);
        response.put("status", "ORDER_PLACED_CONFIRMED");
        response.put("estimatedDeliveryMinutes", 12);
        response.put("deliveryAddress", req.deliveryAddress());
        response.put("paymentMethod", req.paymentMethod());
        response.put("summary", summary);
        response.put("trackingEndpoint", "/ws/tracking/" + orderId);
        response.put("placedAt", Instant.now().toString());

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> buildSummary(String userId, List<CartItem> items) {
        BigDecimal subtotal = BigDecimal.ZERO;
        int totalQuantity = 0;

        for (CartItem item : items) {
            subtotal = subtotal.add(item.price().multiply(BigDecimal.valueOf(item.quantity())));
            totalQuantity += item.quantity();
        }

        BigDecimal deliveryFee = subtotal.compareTo(BigDecimal.valueOf(199)) >= 0 ? BigDecimal.ZERO : BigDecimal.valueOf(25.00);
        BigDecimal platformFee = BigDecimal.valueOf(5.00);
        BigDecimal tax = subtotal.multiply(BigDecimal.valueOf(0.05)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPayable = subtotal.add(deliveryFee).add(platformFee).add(tax);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("userId", userId);
        summary.put("totalItems", totalQuantity);
        summary.put("items", items);
        summary.put("subtotal", subtotal);
        summary.put("deliveryFee", deliveryFee);
        summary.put("platformFee", platformFee);
        summary.put("tax", tax);
        summary.put("totalPayable", totalPayable);
        return summary;
    }
}
