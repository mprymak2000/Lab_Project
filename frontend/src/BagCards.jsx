import {useEffect} from "react";

const BagCards = () => {

    const [bagData, setBagData] = useState({});

    useEffect(() => {
        fetch('http://localhost:5000/api/recent-bags')
        .then(res => res.json())
        .then(data => setBagData(data));
    }, []);

    return (
    <>
      {Object.entries(bagData).map(([bagName, plasmids]) => (
        <div key={bagName} className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-2">📦 Bag {bagName}</h3>
          <div className="space-y-1">
            {plasmids.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="font-mono">{p.id}</span>
                <span className="text-blue-600">{p.volume}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default BagCards;