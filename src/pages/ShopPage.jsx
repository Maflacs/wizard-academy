import items from "../data/items";
import "./ShopPage.css";

const statLabels = {
  magicPower: "Mágikus erő",
  defense: "Védelem",
  focus: "Fókusz",
};

function ShopPage({ player, message, onPurchaseItem }) {
  const formattedGold = new Intl.NumberFormat("hu-HU").format(player.gold);

  return (
    <section className="page">
      <p className="eyebrow">A Görbe Piac</p>
      <h2>Bolt</h2>
      <p className="lead">Hasznos holmik veszélyes tanulmányokhoz.</p>
      <p className="shop-gold">Aranyad: {formattedGold} korona</p>
      <div className="shop-grid">
        {items.map((item) => (
          <article className="parchment-panel item" key={item.id}>
            <span className="item-mark">{item.mark}</span>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            {item.bonuses && Object.keys(item.bonuses).length > 0 && (
              <div className="item-bonuses">
                {Object.entries(item.bonuses).map(([stat, bonus]) => (
                  <span key={stat}>
                    +{bonus} {statLabels[stat]}
                  </span>
                ))}
              </div>
            )}
            <strong>
              {new Intl.NumberFormat("hu-HU").format(item.price)} korona
            </strong>
            {player.gold < item.price && (
              <span className="insufficient-gold-hint">
                Nincs nálad elég arany.
              </span>
            )}
            <button
              className="button"
              type="button"
              onClick={() => onPurchaseItem(item)}
              disabled={player.gold < item.price}
            >
              Megvásárolom
            </button>
          </article>
        ))}
      </div>
      {message && <p className="game-message">{message}</p>}
    </section>
  );
}

export default ShopPage;
