package pe.edu.upn.campuscircular.modules.transaction.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateTransactionRequest(
    @NotNull @Positive @JsonAlias({"publicationId", "publicacionId"}) Long idPublicacion,
    @Positive @JsonAlias({"offeredPublicationId", "publicacionOfrecidaId"}) Long idPublicacionOfrecida,
    @Size(max = 1000) @JsonAlias({"mensaje", "message"}) String mensajeInicial
) {
    public CreateTransactionRequest(Long idPublicacion, Long idPublicacionOfrecida) {
        this(idPublicacion, idPublicacionOfrecida, null);
    }
}
