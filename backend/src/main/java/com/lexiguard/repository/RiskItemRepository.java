package com.lexiguard.repository;

import com.lexiguard.entity.Document;
import com.lexiguard.entity.RiskItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RiskItemRepository extends JpaRepository<RiskItem, Long> {
    List<RiskItem> findByDocument(Document document);
    void deleteByDocument(Document document);
}
