import { useEffect, useState } from "react";
import items from "../data/items";
import { formatAcademyYear, getAcademyYear } from "../utils/academy";
import {
  formatItemBonuses,
  getItemSellPrice,
  isItemSellable,
} from "../utils/items";
import "./ShopPage.css";

function ShopPage({ player, onPurchaseItem, onSellItem, isResting }) {
  const [saleMessage, setSaleMessage] = useState("");
  const numberFormatter = new Intl.NumberFormat("hu-HU");
  const formattedGold = numberFormatter.format(player.gold);
  const academyYear = getAcademyYear(player);
  const ownedItems = player.inventory
    .map((inventoryItem) => ({
      ...inventoryItem,
      item: items.find((item) => item.id === inventoryItem.itemId),
    }))
    .filter((inventoryItem) => inventoryItem.item);

  useEffect(() => {
    if (!saleMessage) return undefined;
    const timeoutId = setTimeout(() => setSaleMessage(""), 3000);
    return () => clearTimeout(timeoutId);
  }, [saleMessage]);

  function sellItem(item) {
    const result = onSellItem(item);
    if (!result) return;
    setSaleMessage(
      `Eladtad: ${item.name}. +${numberFormatter.format(result.sellPrice)} korona.`,
    );
  }

  return (
    <section className="page">
      <p className="eyebrow">A Görbe Piac</p>
      <h2>Bolt</h2>
      <p className="lead">Hasznos holmik veszélyes tanulmányokhoz.</p>
      <p className="shop-gold">Aranyad: {formattedGold} korona</p>

      <h3 className="shop-section-title">Kínálat</h3>
      <div className="shop-grid">
        {items.map((item) => {
          const isYearLocked =
            academyYear < (item.requiredAcademyYear ?? 1);
          const isEquipped =
            item.type === "equipment" &&
            player.equipment[item.slot] === item.id;

          return (
            <article className="parchment-panel item" key={item.id}>
              <span className="item-mark">{item.mark}</span>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              {formatItemBonuses(item).length > 0 && (
                <div className="item-bonuses">
                  {formatItemBonuses(item).map((bonus) => (
                    <span key={bonus}>{bonus}</span>
                  ))}
                </div>
              )}
              {item.requiredAcademyYear > 1 && (
                <span className="item-requirement">
                  Szükséges évfolyam:{" "}
                  {formatAcademyYear(item.requiredAcademyYear)}
                </span>
              )}
              {isEquipped && (
                <span className="equipped-item-hint">
                  Jelenleg felszerelve
                </span>
              )}
              <strong>{numberFormatter.format(item.price)} korona</strong>
              {isYearLocked ? (
                <span className="insufficient-gold-hint">
                  Ezen az évfolyamon még nem vásárolható meg.
                </span>
              ) : player.gold < item.price ? (
                <span className="insufficient-gold-hint">
                  Nincs nálad elég arany.
                </span>
              ) : null}
              <button
                className="button"
                type="button"
                onClick={() => onPurchaseItem(item)}
                disabled={
                  isResting || isYearLocked || player.gold < item.price
                }
              >
                Megvásárolom
              </button>
            </article>
          );
        })}
      </div>

      <h3 className="shop-section-title owned-items-title">Saját tárgyaid</h3>
      {ownedItems.length === 0 ? (
        <p className="shop-empty">A táskád még üres.</p>
      ) : (
        <div className="shop-grid selling-grid">
          {ownedItems.map((inventoryItem) => {
            const { item } = inventoryItem;
            const isEquipped = Object.values(player.equipment).includes(
              item.id,
            );
            const sellable = isItemSellable(item);
            const sellPrice = getItemSellPrice(item);

            return (
              <article
                className="parchment-panel item selling-item"
                key={item.id}
              >
                <span className="item-mark">{item.mark}</span>
                <h3>{item.name}</h3>
                <p>Birtokodban: {inventoryItem.quantity} db</p>
                {formatItemBonuses(item).length > 0 && (
                  <div className="item-bonuses">
                    {formatItemBonuses(item).map((bonus) => (
                      <span key={bonus}>{bonus}</span>
                    ))}
                  </div>
                )}
                {isEquipped && (
                  <span className="equipped-item-hint">Felszerelve</span>
                )}
                {sellable ? (
                  <strong>
                    Eladási ár: {numberFormatter.format(sellPrice)} korona
                  </strong>
                ) : (
                  <strong>Nem eladható</strong>
                )}
                {isEquipped && (
                  <span className="sell-hint">
                    Eladás előtt vedd le a felszerelést.
                  </span>
                )}
                {sellable && (
                  <button
                    className="button"
                    type="button"
                    onClick={() => sellItem(item)}
                    disabled={isResting || isEquipped}
                  >
                    Eladom
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
      {saleMessage && (
        <p className="shop-message" role="status" aria-live="polite">
          {saleMessage}
        </p>
      )}
    </section>
  );
}

export default ShopPage;
