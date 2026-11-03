package pe.edu.upn.campuscircular.modules.transaction.controller;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pe.edu.upn.campuscircular.modules.transaction.dto.CreateTransactionRequest;
import pe.edu.upn.campuscircular.modules.transaction.dto.TransactionResponse;
import pe.edu.upn.campuscircular.modules.transaction.service.TransactionService;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(
            @Valid @RequestBody CreateTransactionRequest request,
            Authentication authentication) {
        TransactionResponse response = transactionService.create(authentication.getName(), request);
        return ResponseEntity.status(201).body(response);
    }
}
