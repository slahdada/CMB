-- ============================================================================
-- SCHÉMA DE BASE DE DONNÉES SQL (PostgreSQL / MySQL)
-- Agenda Médical Multi-Praticiens Simultané (Triple Position)
-- ============================================================================

-- 1. Table des Praticiens / Orthophonistes
CREATE TABLE IF NOT EXISTS orthophonistes (
    id VARCHAR(50) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    role VARCHAR(50) DEFAULT 'orthophoniste', -- 'titulaire', 'collaborateur', 'stagiaire', 'remplacant'
    couleur VARCHAR(20) DEFAULT '#0d9488',     -- Code couleur UI (ex: Teal, Rose, Ambre)
    position_defaut INT DEFAULT 1,            -- 1 (Maroua), 2 (Mariem), 3 (Stagiaire)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des 3 praticiens par défaut du cabinet
INSERT INTO orthophonistes (id, nom, role, couleur, position_defaut) VALUES
    ('ortho-1', 'Maroua', 'titulaire', '#0d9488', 1),
    ('ortho-2', 'Mariem', 'collaboratrice', '#6366f1', 2),
    ('ortho-3', 'Stagiaire', 'stagiaire', '#f59e0b', 3)
ON CONFLICT (id) DO NOTHING;

-- 2. Table des Créneaux Horaires Simultanés
CREATE TABLE IF NOT EXISTS creneaux_simultanes (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,                      -- Format YYYY-MM-DD
    heure_debut VARCHAR(10) NOT NULL,        -- Format '14:00'
    heure_fin VARCHAR(10) NOT NULL,          -- Format '14:45' (45 min)
    duree_minutes INT DEFAULT 45,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_creneau_date_heure UNIQUE (date, heure_debut)
);

-- 3. Table des Rendez-vous Simultanés (Triple Position)
-- Chaque créneau horaire peut contenir jusqu'à 3 rendez-vous simultanés (position 1, 2, 3)
CREATE TABLE IF NOT EXISTS rendez_vous_simultanes (
    id VARCHAR(50) PRIMARY KEY,
    creneau_id VARCHAR(50) NOT NULL REFERENCES creneaux_simultanes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    heure VARCHAR(10) NOT NULL,
    position INT NOT NULL CHECK (position IN (1, 2, 3)), -- 1ère, 2ème ou 3ème position
    
    -- Association : [Heure] -> [Nom du Patient] -> [Nom de l'Orthophoniste]
    orthophoniste_nom VARCHAR(150) NOT NULL,             -- Nom dynamique ou libre (ex: Maroua, Mariem, Nouveau Remplaçant)
    orthophoniste_id VARCHAR(50) REFERENCES orthophonistes(id) ON DELETE SET NULL,
    
    patient_nom VARCHAR(200) NOT NULL,                  -- Nom du patient saisi ou sélectionné
    patient_id VARCHAR(50),                             -- Référence optionnelle au dossier patient existant
    telephone_patient VARCHAR(30),                      -- Contact pour rappels WhatsApp / Tél.
    
    status VARCHAR(30) DEFAULT 'planifie',              -- 'planifie', 'en_cours', 'realise', 'annule', 'absent'
    notes TEXT,                                         -- Observations ou motif de séance
    
    derniere_sauvegarde TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte d'unicité stricte : 1 seul praticien/patient par position pour un même créneau
    CONSTRAINT unq_creneau_position UNIQUE (creneau_id, position)
);

-- Index pour optimiser les recherches par date et par praticien
CREATE INDEX IF NOT EXISTS idx_rdv_simultanes_date ON rendez_vous_simultanes (date, heure);
CREATE INDEX IF NOT EXISTS idx_rdv_orthophoniste ON rendez_vous_simultanes (orthophoniste_nom);
CREATE INDEX IF NOT EXISTS idx_rdv_patient ON rendez_vous_simultanes (patient_nom);
