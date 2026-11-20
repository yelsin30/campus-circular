package pe.edu.upn.campuscircular.modules.transaction.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pe.edu.upn.campuscircular.modules.transaction.dto.ConfirmDeliveryRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.CreateRatingRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.CreateTransactionMessageRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.CreateTransactionRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.DeliveryCodeResponse;
import pe.edu.upn.campuscircular.modules.transaction.dto.RatingResponse;
import pe.edu.upn.campuscircular.modules.transaction.dto.RejectTransactionRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.TransactionMessageResponse;
import pe.edu.upn.campuscircular.modules.transaction.dto.TransactionResponse;
import pe.edu.upn.campuscircular.modules.transaction.service.TransactionService;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping({"", "/my"})
    public ResponseEntity<List<TransactionResponse>> findMyTransactions(
            Authentication authentication) {
        return ResponseEntity.ok(transactionService.findByUser(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(
            @Valid @RequestBody CreateTransactionRequest request,
            Authentication authentication) {
        TransactionResponse response = transactionService.create(authentication.getName(), request);
        return ResponseEntity.status(201).body(response);
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<TransactionResponse> accept(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(transactionService.accept(authentication.getName(), id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<TransactionResponse> reject(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) RejectTransactionRequest request,
            Authentication authentication) {
        String reason = request != null ? request.reason() : null;
        return ResponseEntity.ok(transactionService.reject(authentication.getName(), id, reason));
    }

    @PostMapping("/{id}/delivery-code")
    public ResponseEntity<DeliveryCodeResponse> generateDeliveryCode(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(
            transactionService.generateDeliveryCode(authentication.getName(), id));
    }

    @PostMapping("/{id}/confirm-delivery")
    public ResponseEntity<TransactionResponse> confirmDelivery(
            @PathVariable Long id,
            @Valid @RequestBody ConfirmDeliveryRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(
            transactionService.confirmDelivery(authentication.getName(), id, request));
    }

    @PostMapping("/{id}/ratings")
    public ResponseEntity<RatingResponse> rate(
            @PathVariable Long id,
            @Valid @RequestBody CreateRatingRequest request,
            Authentication authentication) {
        return ResponseEntity.status(201).body(
            transactionService.rate(authentication.getName(), id, request));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<TransactionMessageResponse>> getMessages(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(
            transactionService.getMessages(authentication.getName(), id));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<TransactionMessageResponse> sendMessage(
            @PathVariable Long id,
            @Valid @RequestBody CreateTransactionMessageRequest request,
            Authentication authentication) {
        return ResponseEntity.status(201).body(
            transactionService.sendMessage(authentication.getName(), id, request));
    }
}
