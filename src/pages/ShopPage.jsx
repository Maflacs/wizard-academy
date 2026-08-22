import items from "../data/items";
import "./ShopPage.css";

function ShopPage() {
  return (
    <section className="page">
      <p className="eyebrow">A Görbe Piac</p>
      <h2>Bolt</h2>
      <p className="lead">Hasznos holmik veszélyes tanulmányokhoz.</p>
      <div className="shop-grid">
        {items.map((item) => (
          <article className="parchment-panel item" key={item.name}>
            <span className="item-mark">{item.mark}</span>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <strong>{item.price}</strong>
            <button className="button" type="button">
              Megvásárolom
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ShopPage;
