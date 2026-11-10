import { useState, useEffect } from 'react';
import {
  X,
  Package,
  AlertTriangle,
} from 'lucide-react';
import {
  STORAGE_LOCATIONS,
  UNITS_OF_MEASURE,
} from '../../services/inventoryService.js';
import styles from './InventoryItemModal.module.css';

export function InventoryItemModal({
  isOpen,
  onClose,
  onSave,
  itemToEdit = null,
  categories = [],
  onAddCustomCategory,
}) {
  const isEditing = Boolean(itemToEdit);

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Packaging materials');
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [initialQty, setInitialQty] = useState('');
  const [minimumStockLevel, setMinimumStockLevel] = useState('5');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [unitCost, setUnitCost] = useState('');
  const [storageLocation, setStorageLocation] = useState('Main Store');
  const [supplier, setSupplier] = useState('');
  const [sku, setSku] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchLotNumber, setBatchLotNumber] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setItemName(itemToEdit.itemName || itemToEdit.name || '');
      setCategory(itemToEdit.category || 'Packaging materials');
      setDescription(itemToEdit.description || '');
      setUnit(itemToEdit.unit || 'pcs');
      setMinimumStockLevel(String(itemToEdit.minimumStockLevel ?? 5));
      setReorderLevel(String(itemToEdit.reorderLevel ?? 10));
      setUnitCost(itemToEdit.unitCost ? String(itemToEdit.unitCost) : '');
      setStorageLocation(itemToEdit.storageLocation || itemToEdit.location || 'Main Store');
      setSupplier(itemToEdit.supplier || '');
      setSku(itemToEdit.sku || '');
      setExpiryDate(itemToEdit.expiryDate || '');
      setBatchLotNumber(itemToEdit.batchLotNumber || '');
    } else {
      setItemName('');
      setCategory(categories[0] || 'Packaging materials');
      setDescription('');
      setUnit('pcs');
      setInitialQty('');
      setMinimumStockLevel('5');
      setReorderLevel('10');
      setUnitCost('');
      setStorageLocation('Main Store');
      setSupplier('');
      setSku('');
      setExpiryDate('');
      setBatchLotNumber('');
    }
    setError('');
    setShowAddCat(false);
  }, [itemToEdit, isOpen, categories]);

  if (!isOpen) return null;

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const added = await onAddCustomCategory(newCatName.trim());
      setCategory(added);
      setNewCatName('');
      setShowAddCat(false);
    } catch (err) {
      setError(err.message || 'Failed to add custom category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!itemName.trim()) {
      setError('Item name is required.');
      return;
    }
    if (!category.trim()) {
      setError('Category is required.');
      return;
    }

    const minLevel = Number(minimumStockLevel);
    if (isNaN(minLevel) || minLevel < 0) {
      setError('Minimum stock level must be 0 or greater.');
      return;
    }

    const reorder = Number(reorderLevel);
    if (isNaN(reorder) || reorder < 0) {
      setError('Reorder level must be 0 or greater.');
      return;
    }

    const cost = unitCost === '' ? 0 : Number(unitCost);
    if (isNaN(cost) || cost < 0) {
      setError('Unit purchase cost cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        itemName: itemName.trim(),
        category,
        description: description.trim(),
        unit,
        minimumStockLevel: minLevel,
        reorderLevel: reorder,
        unitCost: cost,
        storageLocation,
        supplier: supplier.trim(),
        sku: sku.trim(),
        expiryDate: expiryDate || null,
        batchLotNumber: batchLotNumber.trim(),
      };

      if (!isEditing) {
        payload.currentQuantity = initialQty === '' ? 0 : Math.max(0, Number(initialQty));
      }

      await onSave(payload, itemToEdit?.itemId || itemToEdit?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save inventory item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Package size={20} />
            {isEditing ? `Edit Item: ${itemToEdit.itemId}` : 'Register New Farm Supply / Tool'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && (
            <div className={styles.errorAlert}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.formGrid}>
            {/* Item Name */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Item Name *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Biodegradable Paper Egg Trays"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.formLabel}>Category *</label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#40916c', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setShowAddCat(!showAddCat)}
                >
                  {showAddCat ? 'Cancel Custom Category' : '+ Add Custom Category'}
                </button>
              </div>

              {!showAddCat ? (
                <select
                  className={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Enter new category name..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                  <button
                    type="button"
                    style={{ padding: '0.45rem 0.75rem', backgroundColor: '#40916c', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    onClick={handleAddCategory}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Unit */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Unit of Measurement *</label>
              <select
                className={styles.select}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              >
                {UNITS_OF_MEASURE.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Storage Location */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Storage Location *</label>
              <select
                className={styles.select}
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                required
              >
                {STORAGE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Initial Quantity (Only in Create Mode) */}
            {!isEditing ? (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Initial Quantity in Stock</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={styles.input}
                  placeholder="0"
                  value={initialQty}
                  onChange={(e) => setInitialQty(e.target.value)}
                />
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Current Quantity (Stock)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={`${itemToEdit.currentQuantity || 0} ${itemToEdit.unit || ''}`}
                  disabled
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
              </div>
            )}

            {/* Unit Purchase Cost */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Unit Purchase Cost (₦)</label>
              <input
                type="number"
                min="0"
                step="any"
                className={styles.input}
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>

            {/* Minimum Stock Level */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Minimum Stock Level</label>
              <input
                type="number"
                min="0"
                step="any"
                className={styles.input}
                value={minimumStockLevel}
                onChange={(e) => setMinimumStockLevel(e.target.value)}
              />
            </div>

            {/* Reorder Level */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reorder Level</label>
              <input
                type="number"
                min="0"
                step="any"
                className={styles.input}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>

            {/* Supplier */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Supplier / Vendor</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Crown Packaging Ltd"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            {/* Expiry Date (Optional) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expiry Date (Where Applicable)</label>
              <input
                type="date"
                className={styles.input}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            {/* Batch / Lot # */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Batch / Lot # (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. LOT-2026-99"
                value={batchLotNumber}
                onChange={(e) => setBatchLotNumber(e.target.value)}
              />
            </div>

            {/* SKU / Code */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>SKU / Item Code (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. PKG-TRAY-01"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Description (Optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Specifications, size, dimensions, intended use..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Item' : 'Register Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
