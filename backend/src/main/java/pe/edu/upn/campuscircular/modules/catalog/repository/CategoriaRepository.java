package pe.edu.upn.campuscircular.modules.catalog.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import pe.edu.upn.campuscircular.modules.catalog.domain.Categoria;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {}
