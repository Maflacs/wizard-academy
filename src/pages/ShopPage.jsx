import items from "../data/items";
import { formatAcademyYear, getAcademyYear } from "../utils/academy";
import { formatItemBonuses } from "../utils/items";
import "./ShopPage.css";

function ShopPage({ player, onPurchaseItem, isResting }) {
  const formattedGold = new Intl.NumberFormat("hu-HU").format(player.gold);
  const academyYear = getAcademyYear(player);

  return (
    <section className="page">
      <p className="eyebrow">A Görbe Piac</p>
      <h2>Bolt</h2>
      <p className="lead">Hasznos holmik veszélyes tanulmányokhoz.</p>
      <p className="shop-gold">Aranyad: {formattedGold} korona</p>
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
            {item.bonuses && Object.keys(item.bonuses).length > 0 && (
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
              <span className="equipped-item-hint">Jelenleg felszerelve</span>
            )}
            <strong>
              {new Intl.NumberFormat("hu-HU").format(item.price)} korona
            </strong>
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
    </section>
  );
}

export default ShopPage;
