-- Nuevo tipo de caso: por evaluar (default para leads del médico)
alter type patient_case_type add value if not exists 'pending_evaluation';
